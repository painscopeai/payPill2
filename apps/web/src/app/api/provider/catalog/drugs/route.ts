import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DrugItem = {
	name?: string;
	default_strength?: string | null;
	default_route?: string | null;
	default_frequency?: string | null;
	default_duration_days?: number | null;
	default_quantity?: number | null;
	default_refills?: number | null;
	notes?: string | null;
	sort_order?: number | null;
};

/** GET — practice drug formulary for consultation prescribing. */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;
	if (!ctx.providerOrgId) {
		return NextResponse.json({ items: [], message: 'Link your practice first.' });
	}

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_drug_catalog')
		.select('*')
		.eq('provider_org_id', ctx.providerOrgId)
		.eq('is_active', true)
		.order('sort_order', { ascending: true })
		.order('name', { ascending: true })
		.limit(5000);

	if (error) {
		if (/does not exist|schema cache/i.test(error.message)) {
			return NextResponse.json({ items: [], message: 'Drug catalog not migrated yet.' });
		}
		console.error('[api/provider/catalog/drugs GET]', error.message);
		return NextResponse.json({ error: 'Failed to load catalog' }, { status: 500 });
	}

	return NextResponse.json({ items: data || [] });
}

/** POST — bulk add or replace catalog rows. Body: { items: DrugItem[], replace?: boolean } */
export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	if (!ctx.providerOrgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		items?: DrugItem[];
		replace?: boolean;
	};
	const rawItems = Array.isArray(body.items) ? body.items : [];
	const items = rawItems
		.map((it) => ({
			provider_org_id: ctx.providerOrgId,
			name: String(it.name || '').trim(),
			default_strength: it.default_strength != null ? String(it.default_strength).trim() || null : null,
			default_route: it.default_route != null ? String(it.default_route).trim() || null : null,
			default_frequency: it.default_frequency != null ? String(it.default_frequency).trim() || null : null,
			default_duration_days:
				typeof it.default_duration_days === 'number' && Number.isFinite(it.default_duration_days)
					? Math.max(0, Math.floor(it.default_duration_days))
					: null,
			default_quantity:
				typeof it.default_quantity === 'number' && Number.isFinite(it.default_quantity)
					? Math.max(0, Math.floor(it.default_quantity))
					: null,
			default_refills:
				typeof it.default_refills === 'number' && Number.isFinite(it.default_refills)
					? Math.max(0, Math.floor(it.default_refills))
					: 0,
			notes: it.notes != null ? String(it.notes).trim() || null : null,
			sort_order: typeof it.sort_order === 'number' && Number.isFinite(it.sort_order) ? Math.floor(it.sort_order) : 0,
			is_active: true,
		}))
		.filter((r) => r.name.length > 0);

	if (!items.length) {
		return NextResponse.json({ error: 'No valid rows (each item needs a name).' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();

	if (body.replace) {
		const { error: delErr } = await sb.from('provider_drug_catalog').delete().eq('provider_org_id', ctx.providerOrgId);
		if (delErr) {
			console.error('[api/provider/catalog/drugs POST delete]', delErr.message);
			return NextResponse.json({ error: 'Failed to replace catalog' }, { status: 500 });
		}
	}

	const { error: insErr } = await sb.from('provider_drug_catalog').insert(items);
	if (insErr) {
		if (/does not exist|schema cache/i.test(insErr.message)) {
			return NextResponse.json(
				{ error: 'Drug catalog table missing. Apply migration 20260614150000_provider_catalog_encounter_rx_labs.sql.' },
				{ status: 503 },
			);
		}
		console.error('[api/provider/catalog/drugs POST insert]', insErr.message);
		return NextResponse.json({ error: 'Failed to import catalog' }, { status: 500 });
	}

	const { data: refreshed } = await sb
		.from('provider_drug_catalog')
		.select('*')
		.eq('provider_org_id', ctx.providerOrgId)
		.eq('is_active', true)
		.order('sort_order', { ascending: true })
		.order('name', { ascending: true })
		.limit(5000);

	return NextResponse.json({ ok: true, imported: items.length, items: refreshed || [] });
}
