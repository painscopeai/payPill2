import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';

/**
 * Validates Authorization: Bearer <supabase_access_token> and sets req.supabaseUserId (+ req.profileRole when available).
 */
export async function supabaseBearerUser(req, res, next) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'Unauthorized: missing bearer token' });
		}
		const token = authHeader.slice(7).trim();
		const sb = getSupabaseAdmin();
		const { data: userData, error: authErr } = await sb.auth.getUser(token);
		if (authErr || !userData?.user) {
			return res.status(401).json({ error: 'Unauthorized: invalid token' });
		}
		req.supabaseUserId = userData.user.id;
		const { data: profile } = await sb
			.from('profiles')
			.select('role')
			.eq('id', userData.user.id)
			.maybeSingle();
		req.profileRole = profile?.role || null;
		next();
	} catch (e) {
		logger.error('[supabaseBearerUser]', e);
		return res.status(401).json({ error: 'Unauthorized' });
	}
}
