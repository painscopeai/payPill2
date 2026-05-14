import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LabItem = {
	test_name?: string;
	code?: string | null;
	category?: string | null;
	notes?: string | null;
	sort_order?: number | null;
};

/** GET — practice lab test catalog. */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;
	if (!ctx.providerOrgId) {
		return NextResponse.json({ items: [], message: 'Link your practice first.' });
	}

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_lab_test_catalog')
		.select('*')
		.eq('provider_org_id', ctx.providerOrgId)
		.eq('is_active', true)
		.order('sort_order', { ascending: true })
		.order('test_name', { ascending: true })
		.limit(5000);

	if (error) {
		if (/does not exist|schema cache/i.test(error.message)) {
			return NextResponse.json({ items: [], message: 'Lab catalog not migrated yet.' });
		}
		console.error('[api/provider/catalog/labs GET]', error.message);
		return NextResponse.json({ error: 'Failed to load catalog' }, { status: 500 });
	}

	return NextResponse.json({ items: data || [] });
}

/** POST — bulk add or replace lab catalog. Body: { items: LabItem[], replace?: boolean } */
export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	if (!ctx.providerOrgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const body = (await request.json().catch(() => ({}))) as { items?: LabItem[]; replace?: boolean };
	const rawItems = Array.isArray(body.items) ? body.items : [];
	const items = rawItems
		.map((it) => ({
			provider_org_id: ctx.providerOrgId,
			test_name: String(it.test_name || '').trim(),
			code: it.code != null ? String(it.code).trim() || null : null,
			category: it.category != null ? String(it.category).trim() || null : null,
			notes: it.notes != null ? String(it.notes).trim() || null : null,
			sort_order: typeof it.sort_order === 'number' && Number.isFinite(it.sort_order) ? Math.floor(it.sort_order) : 0,
			is_active: true,
		}))
		.filter((r) => r.test_name.length > 0);

	if (!items.length) {
		return NextResponse.json({ error: 'No valid rows (each item needs test_name).' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();

	if (body.replace) {
		const { error: delErr } = await sb.from('provider_lab_test_catalog').delete().eq('provider_org_id', ctx.providerOrgId);
		if (delErr) {
			console.error('[api/provider/catalog/labs POST delete]', delErr.message);
			return NextResponse.json({ error: 'Failed to replace catalog' }, { status: 500 });
		}
	}

	const { error: insErr } = await sb.from('provider_lab_test_catalog').insert(items);
	if (insErr) {
		if (/does not exist|schema cache/i.test(insErr.message)) {
			return NextResponse.json(
				{ error: 'Lab catalog table missing. Apply migration 20260614150000_provider_catalog_encounter_rx_labs.sql.' },
				{ status: 503 },
			);
		}
		console.error('[api/provider/catalog/labs POST insert]', insErr.message);
		return NextResponse.json({ error: 'Failed to import catalog' }, { status: 500 });
	}

	const { data: refreshed } = await sb
		.from('provider_lab_test_catalog')
		.select('*')
		.eq('provider_org_id', ctx.providerOrgId)
		.eq('is_active', true)
		.order('sort_order', { ascending: true })
		.order('test_name', { ascending: true })
		.limit(5000);

	return NextResponse.json({ ok: true, imported: items.length, items: refreshed || [] });
}
