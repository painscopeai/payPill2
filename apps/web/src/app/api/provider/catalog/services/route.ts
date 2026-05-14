import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SvcItem = {
	name?: string;
	price?: number | null;
	notes?: string | null;
	unit?: string | null;
	category?: string | null;
	sort_order?: number | null;
};

function mapSvcInsert(orgId: string, it: SvcItem) {
	const price = typeof it.price === 'number' && Number.isFinite(it.price) ? Math.max(0, it.price) : 0;
	return {
		provider_id: orgId,
		name: String(it.name || '').trim(),
		category: (it.category && String(it.category).trim()) || 'service',
		unit: (it.unit && String(it.unit).trim()) || 'per_visit',
		price,
		currency: 'USD',
		notes: it.notes != null ? String(it.notes).trim() || null : null,
		is_active: true,
		sort_order: typeof it.sort_order === 'number' && Number.isFinite(it.sort_order) ? Math.floor(it.sort_order) : 0,
	};
}

/** GET — published services for this practice (provider_services). */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;
	if (!ctx.providerOrgId) {
		return NextResponse.json({ items: [], message: 'Link your practice first.' });
	}

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_services')
		.select('id, name, category, unit, price, currency, notes, is_active, sort_order')
		.eq('provider_id', ctx.providerOrgId)
		.order('sort_order', { ascending: true })
		.order('name', { ascending: true })
		.limit(5000);

	if (error) {
		console.error('[api/provider/catalog/services GET]', error.message);
		return NextResponse.json({ error: 'Failed to load services' }, { status: 500 });
	}

	return NextResponse.json({ items: data || [] });
}

/** POST — single `{ item }` or bulk `{ items[] }` (append). */
export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	const orgId = ctx.providerOrgId;
	if (!orgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const body = (await request.json().catch(() => ({}))) as { item?: SvcItem; items?: SvcItem[] };
	const sb = getSupabaseAdmin();

	if (body.item && typeof body.item === 'object' && !Array.isArray(body.items)) {
		const row = mapSvcInsert(orgId, body.item);
		if (!row.name) {
			return NextResponse.json({ error: 'Name is required' }, { status: 400 });
		}
		const { data, error } = await sb.from('provider_services').insert(row).select().single();
		if (error) {
			console.error('[api/provider/catalog/services POST single]', error.message);
			return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
		}
		return NextResponse.json({ ok: true, item: data });
	}

	const rawItems = Array.isArray(body.items) ? body.items : [];
	const items = rawItems.map((it) => mapSvcInsert(orgId, it)).filter((r) => r.name.length > 0);

	if (!items.length) {
		return NextResponse.json({ error: 'No valid rows (each item needs name).' }, { status: 400 });
	}

	const { error: insErr } = await sb.from('provider_services').insert(items);
	if (insErr) {
		console.error('[api/provider/catalog/services POST]', insErr.message);
		return NextResponse.json({ error: 'Failed to import services' }, { status: 500 });
	}

	const { data: refreshed } = await sb
		.from('provider_services')
		.select('id, name, category, unit, price, currency, notes, is_active, sort_order')
		.eq('provider_id', orgId)
		.order('sort_order', { ascending: true })
		.order('name', { ascending: true })
		.limit(5000);

	return NextResponse.json({ ok: true, imported: items.length, items: refreshed || [] });
}
