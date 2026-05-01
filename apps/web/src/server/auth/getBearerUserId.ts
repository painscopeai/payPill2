import type { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';

/**
 * Resolve Supabase user id from Authorization: Bearer access_token.
 */
export async function getBearerUserId(request: NextRequest): Promise<string | null> {
	const authHeader = request.headers.get('authorization');
	if (!authHeader?.startsWith('Bearer ')) return null;
	const token = authHeader.slice(7).trim();
	if (!token) return null;
	const sb = getSupabaseAdmin();
	const { data: userData, error } = await sb.auth.getUser(token);
	if (error || !userData?.user?.id) return null;
	return userData.user.id;
}
