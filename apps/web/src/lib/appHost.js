const DEFAULT_ADMIN_HOSTS = ['admin.paypill.com'];
const DEFAULT_PORTAL_HOSTS = ['portal.paypill.com'];

const SHARED_AUTH_PATHS = ['/auth/update-password', '/auth/reset-password-required'];

function parseHostList(envValue, defaults) {
	const raw = envValue?.trim();
	if (!raw) return defaults;
	return raw.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
}

/** @returns {'admin' | 'portal' | 'general'} */
export function getAppHostKind() {
	if (typeof window === 'undefined') return 'general';

	const hostname = window.location.hostname.toLowerCase();
	const adminHosts = parseHostList(process.env.NEXT_PUBLIC_ADMIN_HOST, DEFAULT_ADMIN_HOSTS);
	const portalHosts = parseHostList(process.env.NEXT_PUBLIC_PORTAL_HOST, DEFAULT_PORTAL_HOSTS);

	if (adminHosts.includes(hostname)) return 'admin';
	if (portalHosts.includes(hostname)) return 'portal';
	return 'general';
}

export function getAdminAppOrigin() {
	const configured = process.env.NEXT_PUBLIC_ADMIN_APP_ORIGIN?.trim().replace(/\/$/, '');
	if (configured) return configured;
	if (typeof window !== 'undefined' && getAppHostKind() === 'admin') {
		return window.location.origin;
	}
	return 'https://admin.paypill.com';
}

export function getPortalAppOrigin() {
	const configured = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim().replace(/\/$/, '');
	if (configured) return configured;
	return 'https://portal.paypill.com';
}

export function isSharedAuthPath(pathname) {
	return SHARED_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isAdminAppPath(pathname) {
	return pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/auth/admin';
}

/** Portal-only routes (patient, employer, insurance, provider, public forms, portal landing). */
export function isPortalAppPath(pathname) {
	if (isSharedAuthPath(pathname) || isAdminAppPath(pathname)) return false;
	return true;
}
