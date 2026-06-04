import { resolvePatientPostAuthPath } from '@/lib/patientPostAuthPath.js';

/**
 * After a successful password update (recovery or forced change), return the dashboard route.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function resolvePostPasswordDashboardPath(supabase) {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const userId = session?.user?.id;
	if (!userId) return '/';

	const mustChangePassword = session?.user?.user_metadata?.must_change_password === true;

	const { data: profile } = await supabase
		.from('profiles')
		.select('role, onboarding_completed, provider_onboarding_completed')
		.eq('id', userId)
		.maybeSingle();

	const role = profile?.role || session?.user?.user_metadata?.role || 'individual';

	if (role === 'individual') {
		return resolvePatientPostAuthPath({
			onboardingCompleted: profile?.onboarding_completed === true,
			passwordChangeRequired: mustChangePassword,
		});
	}
	if (role === 'employer') return '/employer/dashboard';
	if (role === 'insurance') return '/insurance/dashboard';
	if (role === 'provider') {
		return profile?.provider_onboarding_completed === true
			? '/provider/dashboard'
			: '/provider/onboarding';
	}
	if (role === 'admin') return '/admin/dashboard';
	return '/';
}
