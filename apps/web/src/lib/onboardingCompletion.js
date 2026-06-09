/** Active patient onboarding steps (insurance catalog step removed). */
export const ONBOARDING_TOTAL_STEPS = 13;
export const ONBOARDING_REVIEW_STEP = 13;
export const ONBOARDING_LAST_CONTENT_STEP = 12;

export function getStep1Data(formData) {
	return formData?.step1 && typeof formData.step1 === 'object' ? formData.step1 : {};
}

export function getStep2Data(formData) {
	return formData?.step2 && typeof formData.step2 === 'object' ? formData.step2 : {};
}

export function hasRequiredStep1Fields(step1) {
	return Boolean(
		step1.first_name?.trim?.() &&
			step1.last_name?.trim?.() &&
			step1.phone?.trim?.() &&
			step1.terms_acceptance === true,
	);
}

export function hasRequiredStep2Fields(step2) {
	return Boolean(step2.date_of_birth && step2.sex_assigned_at_birth);
}

export function hasRequiredConsents(step2) {
	return (
		step2.consent_accuracy === true &&
		step2.consent_processing === true &&
		step2.consent_hipaa === true
	);
}

export function canCompleteOnboarding(formData) {
	const step1 = getStep1Data(formData);
	const step2 = getStep2Data(formData);
	return hasRequiredStep1Fields(step1) && hasRequiredStep2Fields(step2) && hasRequiredConsents(step2);
}

/** Merge step-2 consents into review-step payload for /onboarding/complete. */
export function buildCompletePayload(formData) {
	const step2 = getStep2Data(formData);
	const reviewConsents = {
		consent_accuracy: step2.consent_accuracy === true,
		consent_processing: step2.consent_processing === true,
		consent_hipaa: step2.consent_hipaa === true,
		completed_at_ack: new Date().toISOString(),
	};

	return {
		...formData,
		step13: { ...(formData.step13 || {}), ...reviewConsents },
		step14: { ...(formData.step14 || {}), ...reviewConsents },
	};
}
