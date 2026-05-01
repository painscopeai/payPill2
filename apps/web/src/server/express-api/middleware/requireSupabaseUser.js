import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';

/**
 * Requires Authorization: Bearer <Supabase access_token>.
 * Sets req.user = { id } for downstream handlers (replaces legacy PocketBase session).
 */
export async function requireSupabaseUser(req, res, next) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader?.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'Authentication required' });
		}
		const token = authHeader.slice(7).trim();
		const sb = getSupabaseAdmin();
		const { data: userData, error } = await sb.auth.getUser(token);
		if (error || !userData?.user?.id) {
			return res.status(401).json({ error: 'Invalid or expired session' });
		}
		const id = userData.user.id;
		req.user = { id };
		req.supabaseUserId = id;
		next();
	} catch (e) {
		logger.error('[requireSupabaseUser]', e);
		return res.status(503).json({ error: 'Authentication service unavailable' });
	}
}
