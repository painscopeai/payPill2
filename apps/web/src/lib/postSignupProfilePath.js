/**
 * First destination after successful self-service sign-up (immediate session or email verify).
 * Aligns with each portal's "profile" / account setup area.
 */
export function postSignupProfilePath(role) {
	switch (role) {
		case 'individual':
			return '/patient/onboarding';
		case 'employer':
			return '/employer/settings';
		case 'insurance':
			return '/insurance/settings';
		case 'provider':
			return '/provider-onboarding';
		case 'admin':
			return '/admin/dashboard';
		default:
			return '/patient/onboarding';
	}
}
