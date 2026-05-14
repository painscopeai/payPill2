import type { SupabaseClient } from '@supabase/supabase-js';

export type PatientCoverageSummary = {
	patient_user_id: string;
	full_name: string;
	age_years: number | null;
	sex_or_gender: string | null;
	insurance_label: string | null;
	insurance_member_id: string | null;
	member_id_display: string | null;
	coverage_type: 'employer' | 'walk_in';
	employer_name: string | null;
};

function ageFromDob(dob: string | null | undefined): number | null {
	if (!dob || typeof dob !== 'string') return null;
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob.trim());
	if (!m) return null;
	const y = parseInt(m[1], 10);
	const mo = parseInt(m[2], 10) - 1;
	const d = parseInt(m[3], 10);
	const birth = new Date(y, mo, d);
	if (Number.isNaN(birth.getTime())) return null;
	const today = new Date();
	let age = today.getFullYear() - birth.getFullYear();
	const md = today.getMonth() - birth.getMonth();
	if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age -= 1;
	return age >= 0 && age < 130 ? age : null;
}

function maskMemberId(raw: string): string {
	const s = raw.trim();
	if (s.length <= 4) return '****';
	return `${s.slice(0, 2)}…${s.slice(-2)}`;
}

/** Biodata + coverage for provider/insurance portals (service-role callers). */
export async function buildPatientCoverageSummary(
	sb: SupabaseClient,
	patientUserId: string,
): Promise<PatientCoverageSummary | null> {
	const { data: prof, error: pErr } = await sb
		.from('profiles')
		.select(
			'id, first_name, last_name, name, email, date_of_birth, gender, primary_insurance_user_id, insurance_member_id',
		)
		.eq('id', patientUserId)
		.maybeSingle();
	if (pErr || !prof) return null;

	const p = prof as {
		id: string;
		first_name: string | null;
		last_name: string | null;
		name: string | null;
		email: string | null;
		date_of_birth: string | null;
		gender: string | null;
		primary_insurance_user_id: string | null;
		insurance_member_id: string | null;
	};

	const full_name =
		[p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
		String(p.name || '').trim() ||
		String(p.email || '').trim() ||
		'Patient';

	const { data: roster } = await sb
		.from('employer_employees')
		.select('employer_id, insurance_option_slug, status, updated_at')
		.eq('user_id', patientUserId)
		.in('status', ['active', 'pending', 'draft'])
		.not('insurance_option_slug', 'is', null)
		.order('updated_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	const rosterRow = roster as {
		employer_id?: string;
		insurance_option_slug?: string | null;
	} | null;

	let coverage_type: 'employer' | 'walk_in' = 'walk_in';
	let employer_name: string | null = null;
	let insurance_label: string | null = null;
	const insurance_member_id: string | null = p.insurance_member_id?.trim() || null;

	if (rosterRow?.insurance_option_slug) {
		coverage_type = 'employer';
		const insKey = String(rosterRow.insurance_option_slug).trim();
		const { data: io } = await sb.from('insurance_options').select('label').eq('slug', insKey).maybeSingle();
		if (io && (io as { label?: string }).label) {
			insurance_label = (io as { label: string }).label;
		} else {
			const { data: insProf } = await sb
				.from('profiles')
				.select('company_name, name, email')
				.eq('id', insKey)
				.eq('role', 'insurance')
				.maybeSingle();
			const ip = insProf as { company_name?: string | null; name?: string | null; email?: string | null } | null;
			insurance_label =
				String(ip?.company_name || '').trim() ||
				String(ip?.name || '').trim() ||
				String(ip?.email || '').trim() ||
				null;
		}
		if (rosterRow.employer_id) {
			const { data: emp } = await sb
				.from('profiles')
				.select('company_name, name, email')
				.eq('id', rosterRow.employer_id)
				.maybeSingle();
			const e = emp as { company_name?: string | null; name?: string | null; email?: string | null } | null;
			employer_name =
				String(e?.company_name || '').trim() ||
				String(e?.name || '').trim() ||
				String(e?.email || '').trim() ||
				null;
		}
	} else if (p.primary_insurance_user_id) {
		const { data: insProf } = await sb
			.from('profiles')
			.select('company_name, name, email')
			.eq('id', p.primary_insurance_user_id)
			.eq('role', 'insurance')
			.maybeSingle();
		const ip = insProf as { company_name?: string | null; name?: string | null; email?: string | null } | null;
		insurance_label =
			String(ip?.company_name || '').trim() ||
			String(ip?.name || '').trim() ||
			String(ip?.email || '').trim() ||
			null;
	}

	const { data: step2 } = await sb
		.from('patient_onboarding_steps')
		.select('data')
		.eq('user_id', patientUserId)
		.eq('step', 2)
		.maybeSingle();

	const stepData = (step2?.data || {}) as Record<string, unknown>;
	const sex = typeof stepData.sex_assigned_at_birth === 'string' ? stepData.sex_assigned_at_birth : null;
	const genderId = typeof stepData.gender_identity === 'string' ? stepData.gender_identity : null;
	const sex_or_gender = sex || genderId || p.gender || null;

	return {
		patient_user_id: p.id,
		full_name,
		age_years: ageFromDob(p.date_of_birth),
		sex_or_gender,
		insurance_label,
		insurance_member_id,
		member_id_display: insurance_member_id ? maskMemberId(insurance_member_id) : null,
		coverage_type,
		employer_name,
	};
}
