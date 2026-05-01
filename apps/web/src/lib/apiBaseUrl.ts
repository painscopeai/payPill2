/**
 * JSON API base. Default same-origin `/api` (Next Route Handlers).
 * Set `NEXT_PUBLIC_API_BASE_URL` to a full origin to use a separate API server.
 */
export function getApiBaseUrl(): string {
	const v = env('NEXT_PUBLIC_API_BASE_URL') || env('VITE_API_BASE_URL');
	if (v?.trim()) return v.replace(/\/$/, '');
	return '/api';
}

function env(name: string): string | undefined {
	if (typeof process === 'undefined') return undefined;
	return process.env[name];
}

export function warnIfApiLikelyBroken(): void {
	void 0;
}
