import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireInsurance } from '@/server/auth/requireInsurance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RosterRow = {
	id: string;
	user_id: string | null;
	employer_id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	status: string | null;
	health_score: number | null;
	updated_at: string | null;
	created_at: string | null;
};

function adherenceLabel(rate: number): 'High' | 'Medium' | 'Low' | 'N/A' {
	if (!Number.isFinite(rate)) return 'N/A';
	if (rate >= 0.8) return 'High';
	if (rate >= 0.5) return 'Medium';
	return 'Low';
}

function riskLabel(score: number | null): 'Low' | 'Medium' | 'High' {
	if (!Number.isFinite(Number(score))) return 'Medium';
	const s = Number(score);
	if (s >= 80) return 'Low';
	if (s >= 60) return 'Medium';
	return 'High';
}

export async function GET(request: NextRequest) {
	const ctx = await requireInsurance(request);
	if (ctx instanceof NextResponse) return ctx;
	const sb = getSupabaseAdmin();

	const { data: rosterRows, error: rosterErr } = await sb
		.from('employer_employees')
		.select('id,user_id,employer_id,email,first_name,last_name,status,health_score,updated_at,created_at')
		.eq('insurance_option_slug', ctx.insuranceId)
		.order('created_at', { ascending: false })
		.limit(5000);
	if (rosterErr) return NextResponse.json({ error: rosterErr.message }, { status: 500 });

	const rows = (rosterRows ?? []) as RosterRow[];
	const userIds = rows.map((r) => r.user_id).filter(Boolean) as string[];
	const uniqueUserIds = [...new Set(userIds)];
	const employerIds = [...new Set(rows.map((r) => r.employer_id).filter(Boolean))];

	const { data: walkInProfiles, error: walkErr } = await sb
		.from('profiles')
		.select('id, email, first_name, last_name, date_of_birth, insurance_member_id, updated_at, created_at')
		.eq('role', 'individual')
		.eq('primary_insurance_user_id', ctx.insuranceId);
	if (walkErr) return NextResponse.json({ error: walkErr.message }, { status: 500 });

	const rosterUidSet = new Set(uniqueUserIds);
	const walkIns = (
		(walkInProfiles || []) as {
			id: string;
			email: string | null;
			first_name: string | null;
			last_name: string | null;
			date_of_birth: string | null;
			insurance_member_id: string | null;
			updated_at: string | null;
			created_at: string | null;
		}[]
	).filter((w) => !rosterUidSet.has(w.id));
	const walkInUserIds = walkIns.map((w) => w.id);

	const [patientsRes, formsRes, employerRes] = await Promise.all([
		uniqueUserIds.length || walkInUserIds.length
			? sb
					.from('patients')
					.select('user_id,conditions')
					.in('user_id', [...new Set([...uniqueUserIds, ...walkInUserIds])])
			: Promise.resolve({ data: [], error: null }),
		uniqueUserIds.length || walkInUserIds.length
			? sb
					.from('form_responses')
					.select('user_id,completed')
					.in('user_id', [...new Set([...uniqueUserIds, ...walkInUserIds])])
			: Promise.resolve({ data: [], error: null }),
		employerIds.length
			? sb.from('profiles').select('id,company_name,name,email').in('id', employerIds)
			: Promise.resolve({ data: [], error: null }),
	]);
	if (patientsRes.error) return NextResponse.json({ error: patientsRes.error.message }, { status: 500 });
	if (formsRes.error) return NextResponse.json({ error: formsRes.error.message }, { status: 500 });
	if (employerRes.error) return NextResponse.json({ error: employerRes.error.message }, { status: 500 });

	const employerById = new Map<string, { id: string; company_name: string | null; name: string | null; email: string | null }>(
		((employerRes.data || []) as { id: string; company_name: string | null; name: string | null; email: string | null }[]).map((e) => [
			e.id,
			e,
		]),
	);

	const conditionsByUser = new Map<string, string[]>();
	for (const p of patientsRes.data ?? []) {
		conditionsByUser.set(
			String(p.user_id),
			Array.isArray(p.conditions) ? (p.conditions as string[]).filter(Boolean) : [],
		);
	}

	const formsByUser = new Map<string, { total: number; completed: number }>();
	for (const f of formsRes.data ?? []) {
		const uid = String(f.user_id ?? '');
		if (!uid) continue;
		const prev = formsByUser.get(uid) ?? { total: 0, completed: 0 };
		prev.total += 1;
		if (f.completed) prev.completed += 1;
		formsByUser.set(uid, prev);
	}

	const memberRows = rows.map((r) => {
		const uid = r.user_id ? String(r.user_id) : '';
		const formStats = uid ? formsByUser.get(uid) : undefined;
		const adherenceRate =
			formStats && formStats.total > 0 ? formStats.completed / formStats.total : Number.NaN;
		const conditions = uid ? conditionsByUser.get(uid) ?? [] : [];
		const employer = employerById.get(r.employer_id);
		return {
			id: String(r.id),
			coverage_kind: 'employer' as const,
			name: [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.email,
			email: r.email,
			employerId: r.employer_id,
			employer:
				employer?.company_name || employer?.name || employer?.email || r.employer_id,
			score: Number.isFinite(Number(r.health_score)) ? Number(r.health_score) : null,
			chronic: conditions.length,
			adherence: adherenceLabel(adherenceRate),
			risk: riskLabel(Number.isFinite(Number(r.health_score)) ? Number(r.health_score) : null),
			lastActive: r.updated_at || r.created_at,
			status: r.status || 'active',
		};
	});

	const walkInMemberRows = walkIns.map((w) => {
		const uid = w.id;
		const formStats = formsByUser.get(uid);
		const adherenceRate =
			formStats && formStats.total > 0 ? formStats.completed / formStats.total : Number.NaN;
		const conditions = conditionsByUser.get(uid) ?? [];
		return {
			id: `walkin:${w.id}`,
			coverage_kind: 'walk_in' as const,
			name: [w.first_name, w.last_name].filter(Boolean).join(' ').trim() || w.email || w.id,
			email: w.email,
			employerId: null,
			employer: 'Walk-in',
			score: null,
			chronic: conditions.length,
			adherence: adherenceLabel(adherenceRate),
			risk: 'Medium' as const,
			lastActive: w.updated_at || w.created_at,
			status: 'active',
			member_id_hint: w.insurance_member_id ? String(w.insurance_member_id).slice(0, 4) + '…' : null,
		};
	});

	const combinedMembers = [...memberRows, ...walkInMemberRows];

	const scoreRows = combinedMembers.filter((m) => Number.isFinite(Number(m.score)));
	const averageHealthScore = scoreRows.length
		? Number((scoreRows.reduce((sum, m) => sum + Number(m.score), 0) / scoreRows.length).toFixed(1))
		: 0;
	const chronicConditionRate = combinedMembers.length
		? Number(
				(
					(combinedMembers.filter((m) => m.chronic > 0).length / Math.max(combinedMembers.length, 1)) *
					100
				).toFixed(1),
			)
		: 0;
	const adherenceRate = combinedMembers.length
		? Number(
				(
					(combinedMembers.filter((m) => m.adherence === 'High').length / Math.max(combinedMembers.length, 1)) *
					100
				).toFixed(1),
			)
		: 0;
	const preventiveCompletion = combinedMembers.length
		? Number(
				(
					(combinedMembers.filter((m) => m.status === 'active').length / Math.max(combinedMembers.length, 1)) *
					100
				).toFixed(1),
			)
		: 0;

	const conditionCounts = new Map<string, number>();
	for (const list of conditionsByUser.values()) {
		for (const c of list) {
			conditionCounts.set(c, (conditionCounts.get(c) ?? 0) + 1);
		}
	}
	const chronicConditions = [...conditionCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8)
		.map(([name, count]) => ({ name, count }));

	const adherenceCounts = {
		high: combinedMembers.filter((m) => m.adherence === 'High').length,
		medium: combinedMembers.filter((m) => m.adherence === 'Medium').length,
		low: combinedMembers.filter((m) => m.adherence === 'Low').length,
	};
	const adherenceData = [
		{ name: 'Adherent (>80%)', value: adherenceCounts.high },
		{ name: 'Partial (50-80%)', value: adherenceCounts.medium },
		{ name: 'Non-Adherent (<50%)', value: adherenceCounts.low },
	];

	const healthScores = [
		{ range: '0-20', count: scoreRows.filter((m) => Number(m.score) <= 20).length },
		{
			range: '21-40',
			count: scoreRows.filter((m) => Number(m.score) >= 21 && Number(m.score) <= 40).length,
		},
		{
			range: '41-60',
			count: scoreRows.filter((m) => Number(m.score) >= 41 && Number(m.score) <= 60).length,
		},
		{
			range: '61-80',
			count: scoreRows.filter((m) => Number(m.score) >= 61 && Number(m.score) <= 80).length,
		},
		{ range: '81-100', count: scoreRows.filter((m) => Number(m.score) >= 81).length },
	];

	return NextResponse.json({
		kpis: {
			averageHealthScore,
			chronicConditionRate,
			adherenceRate,
			preventiveCompletion,
		},
		chronicConditions,
		adherenceData,
		healthScores,
		members: combinedMembers,
		employers: [...new Set(combinedMembers.map((m) => m.employer))].sort(),
	});
}
