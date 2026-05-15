import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const uid = await getBearerUserId(request);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: profile } = await sb.from('profiles').select('role').eq('id', uid).maybeSingle();
  const role = String((profile as { role?: string } | null)?.role || '');

  let rows: unknown[] | null = null;
  let error: { message: string } | null = null;

  const withRouting = await sb
    .from('notifications')
    .select('id,title,body,category,link,read_at,created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(20);

  if (withRouting.error && /category|link/i.test(withRouting.error.message)) {
    const legacy = await sb
      .from('notifications')
      .select('id,title,body,read_at,created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);
    rows = legacy.data;
    error = legacy.error;
  } else {
    rows = withRouting.data;
    error = withRouting.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = ((rows || []) as Array<{
    id: string;
    title: string | null;
    body: string | null;
    category?: string | null;
    link?: string | null;
    read_at: string | null;
    created_at: string;
  }>).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    category: r.category ?? null,
    link: r.link ?? null,
    read_at: r.read_at,
    created_at: r.created_at,
    read: Boolean(r.read_at),
  }));
  const unread = items.filter((i) => !i.read).length;

  let viewAllPath = '/';
  if (role === 'individual') viewAllPath = '/patient/messages';
  if (role === 'employer') viewAllPath = '/employer/messaging';
  if (role === 'insurance') viewAllPath = '/insurance/dashboard';
  if (role === 'provider') viewAllPath = '/provider/dashboard';
  if (role === 'admin') viewAllPath = '/admin/dashboard';

  return NextResponse.json({ items, unread, role, viewAllPath });
}

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
