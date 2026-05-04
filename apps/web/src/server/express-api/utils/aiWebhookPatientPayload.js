/**
 * Minimum data check before calling the n8n AI webhook.
 * Uses raw `patient_onboarding_steps` rows and `patient_health_records` (no profile/account).
 */
export function hasUsablePatientPayload(onboardingSteps, healthRecords) {
	if (Array.isArray(healthRecords) && healthRecords.length > 0) {
		return true;
	}
	if (!Array.isArray(onboardingSteps) || onboardingSteps.length === 0) {
		return false;
	}
	return onboardingSteps.some((row) => {
		const d = row?.data && typeof row.data === 'object' ? row.data : {};
		const keys = Object.keys(d).filter((k) => k !== 'updated_at');
		return keys.some((k) => {
			const v = d[k];
			if (v == null || v === '') return false;
			if (Array.isArray(v)) return v.length > 0;
			if (typeof v === 'object') return Object.keys(v).length > 0;
			return true;
		});
	});
}

/**
 * Single JSON body for n8n: exact Supabase shapes, no account/profile identity.
 * @param {string} userId
 * @param {Array<{ step: number, data: object, created_at?: string, updated_at?: string }>} onboardingSteps
 * @param {Array<Record<string, unknown>>} healthRecords
 */
export function buildAiWebhookPatientBody(userId, onboardingSteps, healthRecords) {
	const fetchedAt = new Date().toISOString();
	return {
		schemaVersion: 1,
		userId,
		fetchedAt,
		counts: {
			onboardingStepRows: onboardingSteps?.length ?? 0,
			healthRecords: healthRecords?.length ?? 0,
		},
		onboardingSteps: onboardingSteps ?? [],
		healthRecords: healthRecords ?? [],
	};
}
