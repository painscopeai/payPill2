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
		.select('id,user_id,email,first_name,last_name,status,health_score,updated_at,created_at')
		.eq('insurance_option_slug', ctx.insuranceId)
		.order('created_at', { ascending: false })
		.limit(5000);
	if (rosterErr) return NextResponse.json({ error: rosterErr.message }, { status: 500 });

	const rows = (rosterRows ?? []) as RosterRow[];
	const userIds = rows.map((r) => r.user_id).filter(Boolean) as string[];
	const uniqueUserIds = [...new Set(userIds)];

	const [patientsRes, formsRes] = await Promise.all([
		uniqueUserIds.length
			? sb.from('patients').select('user_id,conditions').in('user_id', uniqueUserIds)
			: Promise.resolve({ data: [], error: null }),
		uniqueUserIds.length
			? sb.from('form_responses').select('user_id,completed').in('user_id', uniqueUserIds)
			: Promise.resolve({ data: [], error: null }),
	]);
	if (patientsRes.error) return NextResponse.json({ error: patientsRes.error.message }, { status: 500 });
	if (formsRes.error) return NextResponse.json({ error: formsRes.error.message }, { status: 500 });

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
		return {
			id: String(r.id),
			name: [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.email,
			email: r.email,
			score: Number.isFinite(Number(r.health_score)) ? Number(r.health_score) : null,
			chronic: conditions.length,
			adherence: adherenceLabel(adherenceRate),
			risk: riskLabel(Number.isFinite(Number(r.health_score)) ? Number(r.health_score) : null),
			lastActive: r.updated_at || r.created_at,
			status: r.status || 'active',
		};
	});

	const scoreRows = memberRows.filter((m) => Number.isFinite(Number(m.score)));
	const averageHealthScore = scoreRows.length
		? Number((scoreRows.reduce((sum, m) => sum + Number(m.score), 0) / scoreRows.length).toFixed(1))
		: 0;
	const chronicConditionRate = memberRows.length
		? Number(
				(
					(memberRows.filter((m) => m.chronic > 0).length / Math.max(memberRows.length, 1)) *
					100
				).toFixed(1),
			)
		: 0;
	const adherenceRate = memberRows.length
		? Number(
				(
					(memberRows.filter((m) => m.adherence === 'High').length / Math.max(memberRows.length, 1)) *
					100
				).toFixed(1),
			)
		: 0;
	const preventiveCompletion = memberRows.length
		? Number(
				(
					(memberRows.filter((m) => m.status === 'active').length / Math.max(memberRows.length, 1)) *
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
		high: memberRows.filter((m) => m.adherence === 'High').length,
		medium: memberRows.filter((m) => m.adherence === 'Medium').length,
		low: memberRows.filter((m) => m.adherence === 'Low').length,
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
		members: memberRows,
	});
}
