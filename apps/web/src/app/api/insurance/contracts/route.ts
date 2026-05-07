import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireInsurance } from '@/server/auth/requireInsurance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function toIsoOrNull(value: string | null): string | null {
	if (!value) return null;
	const d = new Date(value);
	return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function monthKey(ts: string | null | undefined): string {
	const d = ts ? new Date(ts) : new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
	const ctx = await requireInsurance(request);
	if (ctx instanceof NextResponse) return ctx;
	const sb = getSupabaseAdmin();
	const now = new Date();
	const url = new URL(request.url);
	const fromIso = toIsoOrNull(url.searchParams.get('from'));
	const toRaw = toIsoOrNull(url.searchParams.get('to'));
	const toIso = toRaw ? new Date(new Date(toRaw).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString() : null;
	const from = fromIso || new Date(now.getFullYear(), 0, 1).toISOString();
	const to = toIso || now.toISOString();

	const { data: employeeCoverage, error: coverageErr } = await sb
		.from('employer_employees')
		.select('id,user_id,employer_id,email,first_name,last_name,department,status,insurance_option_slug')
		.eq('insurance_option_slug', ctx.insuranceId);
	if (coverageErr) return NextResponse.json({ error: coverageErr.message }, { status: 500 });

	type CoverageRow = {
		id: string;
		user_id: string | null;
		employer_id: string;
		email: string;
		first_name: string | null;
		last_name: string | null;
		department: string | null;
		status: string | null;
		insurance_option_slug: string | null;
	};
	type EmployerProfile = { id: string; company_name: string | null; name: string | null; email: string | null };
	const coverageRows = (employeeCoverage || []) as CoverageRow[];
	const userIds = Array.from(new Set(coverageRows.map((r) => r.user_id).filter(Boolean))) as string[];
	const employerIds = Array.from(new Set(coverageRows.map((r) => r.employer_id).filter(Boolean))) as string[];

	const [appointmentRes, contractRes, employerProfiles] = await Promise.all([
		userIds.length
			? sb
					.from('appointments')
					.select(
						'id,user_id,provider_id,provider_name,provider_service_id,appointment_type,reason,status,created_at,appointment_date,appointment_time',
					)
					.in('user_id', userIds)
					.gte('created_at', from)
					.lte('created_at', to)
			: Promise.resolve({ data: [], error: null }),
		sb
			.from('employer_contracts')
			.select(
				'id,name,status,notes,effective_date,contract_type,member_count,contract_value,start_date,end_date,employer_user_id,insurance_user_id,created_at',
			)
			.eq('insurance_user_id', ctx.insuranceId)
			.order('created_at', { ascending: false })
			.limit(1000),
		employerIds.length
			? sb.from('profiles').select('id,company_name,name,email').in('id', employerIds)
			: Promise.resolve({ data: [] }),
	]);
	if (appointmentRes.error) return NextResponse.json({ error: appointmentRes.error.message }, { status: 500 });
	if (contractRes.error) return NextResponse.json({ error: contractRes.error.message }, { status: 500 });

	type AppointmentRow = {
		id: string;
		user_id: string | null;
		provider_id: string | null;
		provider_name: string | null;
		provider_service_id: string | null;
		appointment_type: string | null;
		reason: string | null;
		status: string | null;
		created_at: string | null;
		appointment_date: string | null;
		appointment_time: string | null;
	};
	const appointments = (appointmentRes.data || []) as AppointmentRow[];
	const userToCoverage = new Map(coverageRows.filter((r) => r.user_id).map((r) => [r.user_id as string, r]));
	const serviceIds = Array.from(new Set(appointments.map((a) => a.provider_service_id).filter(Boolean))) as string[];
	type ServiceRow = { id: string; name: string; price: number | null; category: string | null };
	const { data: serviceRows } = serviceIds.length
		? await sb.from('provider_services').select('id,name,price,category').in('id', serviceIds)
		: { data: [] };
	const serviceById = new Map<string, ServiceRow>(
		((serviceRows || []) as ServiceRow[]).map((s) => [s.id, s]),
	);
	const employerById = new Map<string, EmployerProfile>(
		((employerProfiles.data || []) as EmployerProfile[]).map((e) => [e.id, e]),
	);

	const claimRows = appointments
		.map((a) => {
			const coverage = a.user_id ? userToCoverage.get(a.user_id) : null;
			const service: ServiceRow | null = a.provider_service_id ? serviceById.get(a.provider_service_id) || null : null;
			const cost = Number(service?.price || 0);
			const employer = coverage ? employerById.get(coverage.employer_id) : null;
			return {
				id: a.id,
				employer: employer?.company_name || employer?.name || employer?.email || coverage?.employer_id || 'Employer',
				employer_id: coverage?.employer_id || null,
				employee_name:
					coverage &&
					([coverage.first_name, coverage.last_name].filter(Boolean).join(' ').trim() || coverage.email),
				employee_email: coverage?.email || null,
				provider_name: a.provider_name || 'Provider',
				service_name:
					service?.name || a.reason || a.appointment_type || 'General visit - no catalog line',
				service_category: service?.category || 'service',
				status: a.status || 'unknown',
				activity_at: a.created_at,
				appointment_date: a.appointment_date,
				appointment_time: a.appointment_time,
				amount: cost,
				receivable_amount: cost,
			};
		})
		.sort((a, b) => new Date(b.activity_at || 0).getTime() - new Date(a.activity_at || 0).getTime());

	const totalReceivable = claimRows.reduce((sum, r) => sum + r.receivable_amount, 0);
	const uniquePatients = new Set(claimRows.map((r) => r.employee_email).filter(Boolean)).size;
	const uniqueEmployers = new Set(claimRows.map((r) => r.employer_id).filter(Boolean)).size;
	const claimsCount = claimRows.length;
	const avgClaimValue = claimsCount > 0 ? totalReceivable / claimsCount : 0;
	const topServicesMap = new Map<string, { name: string; count: number; amount: number }>();
	for (const row of claimRows) {
		const key = row.service_name;
		const existing = topServicesMap.get(key) || { name: key, count: 0, amount: 0 };
		existing.count += 1;
		existing.amount += row.receivable_amount;
		topServicesMap.set(key, existing);
	}
	const topServices = Array.from(topServicesMap.values())
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	const monthKeys: string[] = [];
	for (let i = 5; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
	}
	const revenueByMonth = new Map<string, { amount: number; claims: number }>();
	for (const key of monthKeys) revenueByMonth.set(key, { amount: 0, claims: 0 });
	for (const row of claimRows) {
		const key = monthKey(row.activity_at || undefined);
		const m = revenueByMonth.get(key);
		if (!m) continue;
		m.amount += row.receivable_amount;
		m.claims += 1;
	}
	const monthlyRevenue = monthKeys.map((key) => {
		const [year, mm] = key.split('-');
		const monthLabel = new Date(Number(year), Number(mm) - 1, 1).toLocaleString('default', { month: 'short' });
		const r = revenueByMonth.get(key)!;
		return { month: monthLabel, amount: r.amount, claims: r.claims };
	});

	const qualityAnalytics = {
		patientsReceivedCare: uniquePatients,
		coveredEmployers: uniqueEmployers,
		claimsCount,
		avgClaimValue: Number(avgClaimValue.toFixed(2)),
		topService: topServices[0]?.name || 'N/A',
		topServiceCount: topServices[0]?.count || 0,
	};

	const items = (contractRes.data ?? []).map((row: Record<string, unknown>) => {
		const employer = employerById.get(String(row.employer_user_id || ''));
		return {
			id: row.id,
			employer: employer?.company_name || employer?.name || employer?.email || row.employer_user_id,
			employer_user_id: row.employer_user_id,
			type: row.contract_type || 'N/A',
			members: Number(row.member_count || 0),
			value: Number(row.contract_value || 0),
			start: row.start_date || row.effective_date || null,
			end: row.end_date || null,
			status: row.status || 'draft',
			name: row.name,
			notes: row.notes || null,
		};
	});

	return NextResponse.json({
		items,
		claims: claimRows,
		monthlyRevenue,
		topServices,
		qualityAnalytics,
		kpis: {
			totalReceivable,
			totalClaims: claimsCount,
			avgClaimValue: Number(avgClaimValue.toFixed(2)),
			patientsReceivedCare: uniquePatients,
		},
		filters: { from, to },
	});
}

export async function POST(request: NextRequest) {
	const ctx = await requireInsurance(request);
	if (ctx instanceof NextResponse) return ctx;
	return NextResponse.json(
		{ error: 'Creating contracts is disabled. Claims are generated from care activity.' },
		{ status: 405 },
	);
}
