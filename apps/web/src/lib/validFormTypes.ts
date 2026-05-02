/** Mirrors Express `VALID_FORM_TYPES` — shared by admin UI and server. */
export const VALID_FORM_TYPES = [
	'patient_onboarding',
	'health_assessment',
	'employer_assessment',
	'insurance_assessment',
	'condition_specific',
	'provider_application',
	'custom',
] as const;

export type ValidFormType = (typeof VALID_FORM_TYPES)[number];
