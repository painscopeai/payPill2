/**
 * Base URL for the Express API (apps/api). Paths are appended as `/analytics/...`, `/forms/...`, etc.
 *
 * Production (Vercel): set `VITE_API_BASE_URL` to the full origin of your deployed API
 * (e.g. `https://paypill-api.railway.app`) — **no** `/hcgi/api` suffix. The static rewrite
 * `/(.*) -> /index.html` would otherwise make `/hcgi/api/*` return HTML and break JSON parsing.
 *
 * Local: leave unset to use `/hcgi/api` if you reverse-proxy to the API, or set
 * `VITE_API_BASE_URL=http://localhost:3001` to hit Express directly.
 */
export function getApiBaseUrl() {
	const v = import.meta.env.VITE_API_BASE_URL?.trim();
	if (v) return v.replace(/\/$/, '');
	return '/hcgi/api';
}

let warnedMissingProdApi = false;

export function warnIfApiLikelyBroken() {
	if (!import.meta.env.PROD || import.meta.env.VITE_API_BASE_URL?.trim() || warnedMissingProdApi) return;
	warnedMissingProdApi = true;
	console.warn(
		'[api] VITE_API_BASE_URL is not set. API calls use relative /hcgi/api, which on Vercel is served as the SPA (HTML), not your Express server. Set VITE_API_BASE_URL in Vercel → Environment Variables to your API origin and redeploy.',
	);
}
