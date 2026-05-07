import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/patient/notifications - latest notifications for current user (unread first by date).
 */
export async function GET(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('notifications')
		.select('id, title, body, category, link, read_at, created_at')
		.eq('user_id', uid)
		.order('created_at', { ascending: false })
		.limit(50);
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	const items = data || [];
	const unread = items.filter((n: { read_at: string | null }) => !n.read_at).length;
	return NextResponse.json({ items, unread });
}

/**
 * PATCH /api/patient/notifications - mark all as read.
 */
export async function PATCH(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const sb = getSupabaseAdmin();
	const { error } = await sb
		.from('notifications')
		.update({ read_at: new Date().toISOString() })
		.eq('user_id', uid)
		.is('read_at', null);
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ ok: true });
}
