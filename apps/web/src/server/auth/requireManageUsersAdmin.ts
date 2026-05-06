import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';

const DEFAULT_ADMIN_PERMISSIONS = [
	'manage_users',
	'view_transactions',
	'manage_transactions',
	'manage_subscriptions',
	'manage_providers',
	'manage_forms',
	'manage_ai',
	'manage_settings',
];

export type ManageUsersContext = {
	adminId: string;
	email: string | null;
};

export async function requireManageUsersAdmin(
	request: NextRequest,
): Promise<ManageUsersContext | NextResponse> {
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
		.select('id, email, role, permissions')
		.eq('id', uid)
		.maybeSingle();
	if (profErr) {
		return NextResponse.json({ error: profErr.message }, { status: 500 });
	}
	if (!profile || profile.role !== 'admin') {
		return NextResponse.json({ error: 'Administrator role required' }, { status: 403 });
	}
	const perms = Array.isArray(profile.permissions) && profile.permissions.length
		? (profile.permissions as string[])
		: DEFAULT_ADMIN_PERMISSIONS;
	if (!perms.includes('manage_users') && !perms.includes('*')) {
		return NextResponse.json({ error: 'Insufficient permissions: manage_users required' }, { status: 403 });
	}
	return {
		adminId: uid,
		email: (profile.email as string) || userData.user.email || null,
	};
}
