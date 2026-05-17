/**
 * Ordered patient entry funnel:
 * 1. Change password (provisioned employees with must_change_password)
 * 2. Health profile / onboarding
 * 3. Dashboard
 */
export function resolvePatientPostAuthPath({
	onboardingCompleted = false,
	passwordChangeRequired = false,
} = {}) {
	if (passwordChangeRequired) return '/auth/reset-password-required';
	if (!onboardingCompleted) return '/patient/onboarding';
	return '/patient/dashboard';
}

export function patientMustCompleteOnboarding(user) {
	return user?.role === 'individual' && user?.onboarding_completed !== true;
}

export function patientOnboardingPath() {
	return '/patient/onboarding';
}
