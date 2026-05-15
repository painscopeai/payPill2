/** Mirrors Express `VALID_FORM_TYPES` — shared by admin UI and server. */
export const VALID_FORM_TYPES = [
	'patient_onboarding',
	'health_assessment',
	'employer_assessment',
	'insurance_assessment',
	'condition_specific',
	'provider_application',
	'custom',
	/** Provider-portal consent documents (sign / acknowledge). */
	'consent',
	/** Provider-portal service-scoped intake questionnaires. */
	'service_intake',
] as const;

export type ValidFormType = (typeof VALID_FORM_TYPES)[number];
