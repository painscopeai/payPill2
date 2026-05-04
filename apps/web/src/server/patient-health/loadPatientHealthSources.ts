import { getSupabaseAdmin } from '@/server/supabase/admin';
import type { RawOnboardingRow } from '@/server/patient-health/buildStructuredPatientOverview';

export type PatientHealthLoadResult =
	| {
			ok: true;
			profile: Record<string, unknown> | null;
			onboardingSteps: RawOnboardingRow[];
			healthRecords: Record<string, unknown>[];
	  }
	| { ok: false; errors: string[] };

const HEALTH_RECORDS_LIMIT = 200;

/**
 * Same Supabase sources as GET /api/patient-health-overview (single source of truth).
 */
export async function loadPatientHealthSources(userId: string): Promise<PatientHealthLoadResult> {
	const sb = getSupabaseAdmin();

	const [profileRes, stepsRes, recordsRes] = await Promise.all([
		sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
		sb
			.from('patient_onboarding_steps')
			.select('step, data, created_at, updated_at')
			.eq('user_id', userId)
			.order('step', { ascending: true }),
		sb
			.from('patient_health_records')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.limit(HEALTH_RECORDS_LIMIT),
	]);

	const errors: string[] = [];
	if (profileRes.error) errors.push(`profile: ${profileRes.error.message}`);
	if (stepsRes.error) errors.push(`onboarding_steps: ${stepsRes.error.message}`);
	if (recordsRes.error) errors.push(`health_records: ${recordsRes.error.message}`);

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		profile: (profileRes.data ?? null) as Record<string, unknown> | null,
		onboardingSteps: (stepsRes.data ?? []) as RawOnboardingRow[],
		healthRecords: (recordsRes.data ?? []) as Record<string, unknown>[],
	};
}
