const buckets = new Map();
const WINDOW_MS = 60 * 1000;
const MAX = 10;

function clientKey(req) {
	const xf = req.headers['x-forwarded-for'];
	if (typeof xf === 'string' && xf.length) {
		return `ai:${xf.split(',')[0].trim()}`;
	}
	return `ai:${req.socket?.remoteAddress || 'unknown'}`;
}

export function integratedAiRateLimit(req, res, next) {
	const key = clientKey(req);
	const now = Date.now();
	let b = buckets.get(key);
	if (!b || now - b.start > WINDOW_MS) {
		b = { start: now, count: 0 };
		buckets.set(key, b);
	}
	b.count += 1;
	if (b.count > MAX) {
		return res.status(429).json({ error: 'Too many AI requests, please try again later' });
	}
	next();
}
