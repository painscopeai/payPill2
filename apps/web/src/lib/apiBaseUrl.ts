/**
 * JSON API base. Default same-origin `/api` (Next Route Handlers).
 *
 * In the browser we always use the current page origin so portal.paypill.com,
 * admin.paypill.com, and *.vercel.app all hit `/api` on the same host — no CORS.
 *
 * Set `NEXT_PUBLIC_API_BASE_URL` only for server-side fetches or a separate API host.
 * If you only set the site origin (e.g. `https://app.vercel.app`), we append `/api`.
 *
 * Use static `process.env.NEXT_PUBLIC_*` access so Next.js can inline values at build time.
 */
function resolveApiBaseFromEnv(): string {
	const raw =
		process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || process.env.VITE_API_BASE_URL?.trim();
	if (!raw) return '/api';

	const v = raw.replace(/\/$/, '');
	if (!v) return '/api';

	if (/^https?:\/\//i.test(v)) {
		try {
			const u = new URL(v);
			const p = u.pathname.replace(/\/$/, '');
			if (p === '' || p === '/') {
				return `${u.origin}/api`;
			}
			return v;
		} catch {
			return '/api';
		}
	}

	return v.startsWith('/') ? v : `/${v}`;
}

export function getApiBaseUrl(): string {
	if (typeof window !== 'undefined') {
		return `${window.location.origin}/api`;
	}

	return resolveApiBaseFromEnv();
}

export function warnIfApiLikelyBroken(): void {
	if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return;

	const envBase = resolveApiBaseFromEnv();
	if (!/^https?:\/\//i.test(envBase)) return;

	try {
		const envOrigin = new URL(envBase).origin;
		if (envOrigin !== window.location.origin) {
			console.warn(
				'[PayPill] NEXT_PUBLIC_API_BASE_URL points to a different origin than this page. ' +
					'Browser requests use same-origin /api instead.',
			);
		}
	} catch {
		/* ignore */
	}
}
