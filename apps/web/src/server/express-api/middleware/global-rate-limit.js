const buckets = new Map();
const WINDOW_MS = 5 * 60 * 1000;
const MAX = 100;

function clientKey(req) {
	const xf = req.headers['x-forwarded-for'];
	if (typeof xf === 'string' && xf.length) {
		return xf.split(',')[0].trim();
	}
	return req.socket?.remoteAddress || 'unknown';
}

/**
 * Simple sliding-window-ish rate limit (per client key).
 */
export function globalRateLimit(req, res, next) {
	const key = clientKey(req);
	const now = Date.now();
	let b = buckets.get(key);
	if (!b || now - b.start > WINDOW_MS) {
		b = { start: now, count: 0 };
		buckets.set(key, b);
	}
	b.count += 1;
	if (b.count > MAX) {
		return res.status(429).json({ error: 'Too many requests, please try again later' });
	}
	next();
}
