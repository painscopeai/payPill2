/**
 * JSON API base. Default same-origin `/api` (Next Route Handlers).
 * Set `NEXT_PUBLIC_API_BASE_URL` to a full origin **or** origin + `/api` if the API is on another host.
 *
 * If you only set the site origin (e.g. `https://app.vercel.app`), we append `/api` so paths like
 * `/onboarding/progress` hit Route Handlers — not the SPA (which returns HTML and breaks `response.json()`).
 *
 * Use static `process.env.NEXT_PUBLIC_*` access so Next.js can inline values at build time.
 */
export function getApiBaseUrl(): string {
	const raw =
		process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || process.env.VITE_API_BASE_URL?.trim();
	if (!raw) return '/api';

	const v = raw.replace(/\/$/, '');
	if (!v) return '/api';

	if (/^https?:\/\//i.test(v)) {
		try {
			const u = new URL(v);
			const p = u.pathname.replace(/\/$/, '');
			// "https://myapp.vercel.app" or "https://myapp.vercel.app/" → JSON API is at .../api
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

export function warnIfApiLikelyBroken(): void {
	void 0;
}
