import { getSupabaseAdmin } from '@/server/supabase/admin';

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

type InsuranceProfile = {
	id: string;
	company_name: string | null;
	name: string | null;
	email: string | null;
};

function todayIsoDate() {
	return new Date().toISOString().slice(0, 10);
}

async function getInsuranceProfile(sb: SupabaseAdmin, insuranceId: string): Promise<InsuranceProfile | null> {
	const { data } = await sb
		.from('profiles')
		.select('id, company_name, name, email')
		.eq('id', insuranceId)
		.eq('role', 'insurance')
		.maybeSingle();
	return (data as InsuranceProfile | null) ?? null;
}

function insuranceDisplayName(row: InsuranceProfile | null, fallbackId: string) {
	if (!row) return fallbackId;
	return row.company_name || row.name || row.email || row.id;
}

/**
 * Ensure there is at least one contract row for employer + insurance and keep
 * contract basics in sync with the member roster shape.
 */
export async function ensureEmployerInsuranceContract(
	sb: SupabaseAdmin,
	params: {
		employerId: string;
		insuranceId: string;
	},
) {
	const { employerId, insuranceId } = params;
	const insurance = await getInsuranceProfile(sb, insuranceId);
	const insuranceName = insuranceDisplayName(insurance, insuranceId);

	const { data: existingRows } = await sb
		.from('employer_contracts')
		.select('id, status')
		.eq('employer_user_id', employerId)
		.eq('insurance_user_id', insuranceId)
		.order('created_at', { ascending: false })
		.limit(1);

	const nowDate = todayIsoDate();
	const { count: memberCount } = await sb
		.from('employer_employees')
		.select('id', { count: 'exact', head: true })
		.eq('employer_id', employerId)
		.eq('insurance_option_slug', insuranceId)
		.in('status', ['active', 'pending', 'draft']);

	const normalizedMemberCount = Number(memberCount || 0);
	const payload = {
		name: `${insuranceName} Employer Coverage Contract`,
		contract_type: 'full_coverage_100_no_copay',
		start_date: nowDate,
		effective_date: nowDate,
		status: normalizedMemberCount > 0 ? 'active' : 'inactive',
		member_count: normalizedMemberCount,
		notes: 'System-generated. All provider services are covered 100% with no co-pay.',
	};

	if (existingRows && existingRows.length > 0) {
		await sb.from('employer_contracts').update(payload).eq('id', existingRows[0].id);
		return existingRows[0].id;
	}

	const { data: created } = await sb
		.from('employer_contracts')
		.insert({
			employer_user_id: employerId,
			insurance_user_id: insuranceId,
			...payload,
		})
		.select('id')
		.maybeSingle();
	return created?.id ?? null;
}

export async function syncEmployerInsuranceContractsForEmployer(sb: SupabaseAdmin, employerId: string) {
	const { data: rows } = await sb
		.from('employer_employees')
		.select('insurance_option_slug')
		.eq('employer_id', employerId)
		.not('insurance_option_slug', 'is', null);

	const insuranceIds = Array.from(
		new Set((rows || []).map((r: { insurance_option_slug?: string | null }) => r.insurance_option_slug).filter(Boolean)),
	) as string[];

	for (const insuranceId of insuranceIds) {
		await ensureEmployerInsuranceContract(sb, { employerId, insuranceId });
	}
}
