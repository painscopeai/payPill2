import { patientOnboardingPath } from '@/lib/patientPostAuthPath.js';

/**
 * First URL after successful self-service sign-up (immediate Supabase session or after email verification).
 *
 * Walk-in patient funnel: Sign up → Profile data form → Dashboard (see patientPostAuthPath.js).
 */
export function postSignupProfilePath(role) {
	switch (role) {
		case 'individual':
			return patientOnboardingPath();
		case 'employer':
			return '/employer/settings';
		case 'insurance':
			return '/insurance/settings';
		case 'provider':
			return '/provider/onboarding';
		case 'admin':
			return '/admin/dashboard';
		default:
			return patientOnboardingPath();
	}
}
