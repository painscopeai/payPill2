import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export type PlatformAdminContext = {
	adminId: string;
	email: string | null;
};

/**
 * Bearer JWT + profiles.role = admin (no granular permission check).
 * Use for admin UI reads that any platform admin should access (e.g. employer pickers).
 */
export async function requirePlatformAdmin(
	request: NextRequest,
): Promise<PlatformAdminContext | NextResponse> {
	const authHeader = request.headers.get('authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
	}
	const jwt = authHeader.slice(7).trim();
	const sb = getSupabaseAdmin();
	const { data: userData, error: authErr } = await sb.auth.getUser(jwt);
	if (authErr || !userData?.user?.id) {
		return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
	}
	const uid = userData.user.id;
	const { data: profile, error: profErr } = await sb
		.from('profiles')
		.select('id, email, role')
		.eq('id', uid)
		.maybeSingle();
	if (profErr) {
		return NextResponse.json({ error: profErr.message }, { status: 500 });
	}
	if (!profile || profile.role !== 'admin') {
		return NextResponse.json({ error: 'Administrator role required' }, { status: 403 });
	}
	return {
		adminId: uid,
		email: (profile.email as string) || userData.user.email || null,
	};
}
