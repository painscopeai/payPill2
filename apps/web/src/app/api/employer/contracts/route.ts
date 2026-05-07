import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireEmployer } from '@/server/auth/requireEmployer';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { syncEmployerInsuranceContractsForEmployer } from '@/server/contracts/employerContracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type EmployeeRow = {
	id: string;
	user_id: string | null;
	email: string;
	first_name: string | null;
	last_name: string | null;
	status: string;
	department: string | null;
	insurance_option_slug: string | null;
};

export async function GET(request: NextRequest) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;
	const sb = getSupabaseAdmin();

	await syncEmployerInsuranceContractsForEmployer(sb, ctx.employerId);

	const [{ data: contractsRows, error: contractsErr }, { data: employeeRows, error: employeesErr }] =
		await Promise.all([
			sb
				.from('employer_contracts')
				.select(
					'id, name, status, notes, contract_type, member_count, start_date, end_date, effective_date, insurance_user_id, created_at, updated_at',
				)
				.eq('employer_user_id', ctx.employerId)
				.order('created_at', { ascending: false }),
			sb
				.from('employer_employees')
				.select(
					'id, user_id, email, first_name, last_name, status, department, insurance_option_slug',
				)
				.eq('employer_id', ctx.employerId)
				.order('created_at', { ascending: false }),
		]);

	if (contractsErr) return NextResponse.json({ error: contractsErr.message }, { status: 500 });
	if (employeesErr) return NextResponse.json({ error: employeesErr.message }, { status: 500 });

	const insuranceIds = Array.from(
		new Set(
			(contractsRows || [])
				.map((row: { insurance_user_id?: string | null }) => row.insurance_user_id)
				.filter(Boolean),
		),
	) as string[];
	const { data: insuranceRows } = await sb
		.from('profiles')
		.select('id, company_name, name, email, status')
		.eq('role', 'insurance')
		.order('email', { ascending: true });
	const insuranceOptions = (insuranceRows || [])
		.filter((row: { status?: string | null }) => row.status !== 'inactive')
		.map((row: { id: string; company_name: string | null; name: string | null; email: string | null }) => ({
			id: row.id,
			label: row.company_name || row.name || row.email || row.id,
		}));

	insuranceOptions.forEach((opt: { id: string }) => {
		if (!insuranceIds.includes(opt.id)) insuranceIds.push(opt.id);
	});

	const profilesById = new Map<string, { id: string; company_name: string | null; name: string | null; email: string | null }>();
	if (insuranceIds.length > 0) {
		const { data: profileRows } = await sb
			.from('profiles')
			.select('id, company_name, name, email')
			.in('id', insuranceIds);
		(profileRows || []).forEach((row: { id: string; company_name: string | null; name: string | null; email: string | null }) =>
			profilesById.set(row.id, row),
		);
	}

	const membersByInsurance = new Map<string, EmployeeRow[]>();
	((employeeRows || []) as EmployeeRow[]).forEach((member) => {
		const insuranceId = member.insurance_option_slug;
		if (!insuranceId) return;
		if (!membersByInsurance.has(insuranceId)) membersByInsurance.set(insuranceId, []);
		membersByInsurance.get(insuranceId)!.push(member);
	});

	const items = (contractsRows || []).map(
		(row: {
			id: string;
			name: string;
			status: string | null;
			notes: string | null;
			contract_type: string | null;
			member_count: number | null;
			start_date: string | null;
			end_date: string | null;
			effective_date: string | null;
			insurance_user_id: string | null;
			created_at: string;
			updated_at: string;
		}) => {
			const insurance = row.insurance_user_id ? profilesById.get(row.insurance_user_id) : null;
			const members = row.insurance_user_id ? membersByInsurance.get(row.insurance_user_id) || [] : [];
			const activeMembers = members.filter((m) => m.status === 'active').length;
			return {
				id: row.id,
				name: row.name,
				status: row.status || 'active',
				type: row.contract_type || 'full_coverage_100_no_copay',
				start_date: row.start_date || row.effective_date,
				end_date: row.end_date,
				notes: row.notes,
				coverage: {
					label: '100% Coverage',
					copay: 0,
					description: 'All provider services are covered by insurance with no co-pay.',
				},
				insurance: {
					id: row.insurance_user_id,
					label: insurance?.company_name || insurance?.name || insurance?.email || row.insurance_user_id,
				},
				member_count: Number(row.member_count || members.length || 0),
				active_member_count: activeMembers,
				members: members.map((m) => ({
					id: m.id,
					user_id: m.user_id,
					name: [m.first_name, m.last_name].filter(Boolean).join(' ').trim() || m.email,
					email: m.email,
					department: m.department,
					status: m.status,
					insurance_option_slug: m.insurance_option_slug,
				})),
				created_at: row.created_at,
				updated_at: row.updated_at,
			};
		},
	);

	return NextResponse.json({ items, insuranceOptions });
}
