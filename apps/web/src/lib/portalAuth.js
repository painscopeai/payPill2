/** @typedef {'individual'|'employer'|'insurance'|'provider'|'admin'} AppPortal */

const PORTAL_LABELS = {
	individual: 'Patient',
	employer: 'Employer',
	insurance: 'Insurance',
	provider: 'Provider',
	admin: 'Administrator',
};

const NON_ADMIN_PORTALS = ['individual', 'employer', 'insurance', 'provider'];

/** Public sign-in route for each app role (path only, for copy-paste in messages). */
const ROLE_SIGN_IN_PATH = {
	individual: '/auth/individual',
	employer: '/auth/employer',
	insurance: '/auth/insurance',
	provider: '/auth/provider',
	admin: '/auth/admin',
};

/**
 * Admin may use any role portal; admin portal is admin-only.
 * @param {AppPortal} portal
 * @param {string | null | undefined} role profile.role
 */
export function portalAllowsRole(portal, role) {
	if (!role) return false;
	if (portal === 'admin') return role === 'admin';
	if (NON_ADMIN_PORTALS.includes(portal)) return role === portal || role === 'admin';
	return role === portal;
}

/**
 * @param {{ role?: string } | null} user
 * @param {AppPortal} portal
 * @param {() => Promise<void>} logout
 */
export async function assertPortalSignIn(user, portal, logout) {
	if (!user?.role) {
		await logout();
		throw new Error('Could not load your account role. Try again or contact support.');
	}
	if (portalAllowsRole(portal, user.role)) return;
	await logout();
	const wantLabel = PORTAL_LABELS[portal] || portal;
	const actualLabel = PORTAL_LABELS[user.role] || user.role || 'Unknown';
	const actualPath = ROLE_SIGN_IN_PATH[user.role] || '/';
	throw new Error(
		`Your account is registered as ${actualLabel}, not ${wantLabel}. Sign in at ${actualPath} (or ask an administrator to change your role to ${wantLabel} in Supabase if you should have employer access).`,
	);
}
