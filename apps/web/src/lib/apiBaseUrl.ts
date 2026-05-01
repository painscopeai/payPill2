/**
 * JSON API base. Default same-origin `/api` (Next Route Handlers).
 * Set `NEXT_PUBLIC_API_BASE_URL` to a full origin to use a separate API server.
 *
 * Use static `process.env.NEXT_PUBLIC_*` access so Next.js can inline values at build time.
 */
export function getApiBaseUrl(): string {
	const v =
		process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || process.env.VITE_API_BASE_URL?.trim();
	if (v) return v.replace(/\/$/, '');
	return '/api';
}

export function warnIfApiLikelyBroken(): void {
	void 0;
}
