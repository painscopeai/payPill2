import { getSupabaseAdmin } from './supabaseAdmin.js';

/**
 * Express helper: read Bearer JWT, resolve user + optional admin flag via profiles.
 * @returns {Promise<{ userId: string, email?: string, role?: string, isAdmin: boolean } | null>}
 */
export async function getBearerAuthContext(req) {
	const authHeader = req.headers.authorization;
	if (!authHeader?.startsWith('Bearer ')) return null;
	const token = authHeader.slice(7).trim();
	const sb = getSupabaseAdmin();
	const { data: userData, error } = await sb.auth.getUser(token);
	if (error || !userData?.user?.id) return null;
	const uid = userData.user.id;
	const { data: profile } = await sb
		.from('profiles')
		.select('email, role')
		.eq('id', uid)
		.maybeSingle();
	return {
		userId: uid,
		email: profile?.email ?? userData.user.email ?? undefined,
		role: profile?.role,
		isAdmin: profile?.role === 'admin',
	};
}
