/**
 * URL Supabase redirects to after the user clicks the password-reset email link.
 * Must be allowlisted in Supabase Dashboard → Authentication → URL Configuration.
 */
export function getPasswordResetRedirectUrl() {
	if (typeof window !== 'undefined') {
		return `${window.location.origin}/auth/update-password`;
	}
	const configured = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim().replace(/\/$/, '');
	if (configured) return `${configured}/auth/update-password`;
	return '/auth/update-password';
}
