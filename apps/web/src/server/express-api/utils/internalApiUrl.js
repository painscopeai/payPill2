/**
 * Build same-origin /api URL for server-side fetch from Express (runs inside Next Route Handler).
 */
export function internalApiUrl(req, apiPath) {
	const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
	const host = req.get('x-forwarded-host') || req.get('host');
	const proto = req.get('x-forwarded-proto') || 'http';
	if (!host) {
		return path;
	}
	return `${proto}://${host}${path.startsWith('/api') ? path : `/api${path}`}`;
}
