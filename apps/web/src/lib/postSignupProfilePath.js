/**
 * First URL after successful self-service sign-up (immediate Supabase session or after email verification).
 *
 * Intended funnel (patients):
 *   1. Sign up
 *   2. Receive verification code (email)
 *   3. Enter code → session established
 *   4. Land here → health profile / onboarding (`/patient/onboarding`), then Dashboard and other routes once complete
 *
 * Other roles: company/account settings or onboarding paths as appropriate.
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
			return '/provider/onboarding';
		case 'admin':
			return '/admin/dashboard';
		default:
			return '/patient/onboarding';
	}
}
