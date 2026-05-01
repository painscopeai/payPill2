import type { NextRequest } from 'next/server';

/**
 * Same-origin `/api/...` URL for server-side fetch from Route Handlers.
 * Replaces Express `internalApiUrl(req, '/foo')` when onboarding/API logic runs natively.
 */
export function internalApiUrlFromRequest(request: NextRequest, apiPath: string): string {
	const u = new URL(request.url);
	const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
	const full = path.startsWith('/api') ? path : `/api${path}`;
	return `${u.origin}${full}`;
}
