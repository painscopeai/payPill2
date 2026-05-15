import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/practice-roles */
export async function GET(request: NextRequest) {
	void request;
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_practice_roles')
		.select('*')
		.order('sort_order', { ascending: true })
		.order('label', { ascending: true });

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ items: data || [] });
}

/** POST /api/admin/practice-roles */
export async function POST(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	const body = (await request.json().catch(() => ({}))) as {
		slug?: string;
		label?: string;
		sort_order?: number;
		active?: boolean;
	};

	const slug = String(body.slug || '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '_');
	const label = String(body.label || '').trim();
	if (!slug || !/^[a-z0-9_]{1,64}$/.test(slug)) {
		return NextResponse.json({ error: 'Invalid slug (letters, numbers, underscores)' }, { status: 400 });
	}
	if (!label) return NextResponse.json({ error: 'label is required' }, { status: 400 });

	const sort_order =
		typeof body.sort_order === 'number' && Number.isFinite(body.sort_order) ? Math.floor(body.sort_order) : 100;
	const active = body.active !== false;

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_practice_roles')
		.insert({ slug, label, sort_order, active })
		.select('*')
		.single();

	if (error) {
		if (error.code === '23505') return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
	return NextResponse.json({ item: data });
}
