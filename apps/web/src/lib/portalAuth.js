/** @typedef {'individual'|'employer'|'insurance'|'provider'|'admin'} AppPortal */

const PORTAL_LABELS = {
	individual: 'Patient',
	employer: 'Employer',
	insurance: 'Insurance',
	provider: 'Provider',
	admin: 'Administrator',
};

const NON_ADMIN_PORTALS = ['individual', 'employer', 'insurance', 'provider'];

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
	const label = PORTAL_LABELS[portal] || portal;
	throw new Error(
		`This portal is for ${label} accounts only. Sign in from the correct portal on the home page.`,
	);
}
