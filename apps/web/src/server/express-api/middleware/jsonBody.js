import { BodyLimit } from '../constants/common.js';

/**
 * Parse JSON / urlencoded bodies (skips multipart so busboy can read the stream).
 */
export function jsonBodyMiddleware(req, res, next) {
	const method = req.method || 'GET';
	if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
		req.body = req.body ?? {};
		return next();
	}

	const ct = String(req.headers['content-type'] || '').toLowerCase();
	if (ct.includes('multipart/form-data')) {
		return next();
	}

	/** Next.js `dispatchLegacyApi` pre-parses JSON; mock req streams may never emit `end` (hang). */
	if (req.__paypillParsedJson === true && req.body != null) {
		return next();
	}

	const chunks = [];
	req.on('data', (c) => {
		chunks.push(c);
		if (Buffer.concat(chunks).length > BodyLimit) {
			req.destroy();
			res.status(413).json({ error: 'Payload too large' });
		}
	});
	req.on('end', () => {
		const raw = Buffer.concat(chunks).toString('utf8');
		if (!raw) {
			req.body = {};
			return next();
		}
		if (ct.includes('application/json')) {
			try {
				req.body = JSON.parse(raw);
			} catch {
				return res.status(400).json({ error: 'Invalid JSON' });
			}
			return next();
		}
		if (ct.includes('application/x-www-form-urlencoded')) {
			const params = new URLSearchParams(raw);
			req.body = Object.fromEntries(params.entries());
			return next();
		}
		req.body = {};
		next();
	});
	req.on('error', next);
}
