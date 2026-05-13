import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATEGORIES = new Set(['service', 'drug', 'other']);
const UNITS = new Set(['per_visit', 'per_dose', 'flat', 'monthly']);

type IncomingItem = {
	name?: unknown;
	category?: unknown;
	unit?: unknown;
	price?: unknown;
	currency?: unknown;
	notes?: unknown;
	sort_order?: unknown;
};

function normalizeItems(rawItems: IncomingItem[]) {
	const normalized: Array<{
		name: string;
		category: string;
		unit: string;
		price: number;
		currency: string;
		notes: string | null;
		sort_order: number;
	}> = [];

	for (let i = 0; i < rawItems.length; i++) {
		const row = rawItems[i];
		const name = typeof row.name === 'string' ? row.name.trim() : '';
		if (!name) continue;

		const cat = typeof row.category === 'string' ? row.category.trim() : 'service';
		if (!CATEGORIES.has(cat)) {
			return { ok: false as const, status: 400, error: `Invalid category on row ${i + 1}` };
		}
		const unit = typeof row.unit === 'string' ? row.unit.trim() : 'per_visit';
		if (!UNITS.has(unit)) {
			return { ok: false as const, status: 400, error: `Invalid unit on row ${i + 1}` };
		}
		const priceRaw = row.price;
		const price =
			typeof priceRaw === 'number'
				? priceRaw
				: typeof priceRaw === 'string'
					? Number.parseFloat(priceRaw)
					: NaN;
		if (!Number.isFinite(price) || price < 0) {
			return { ok: false as const, status: 400, error: `Invalid price on row ${i + 1}` };
		}

		const currency =
			typeof row.currency === 'string' && row.currency.trim()
				? row.currency.trim().toUpperCase().slice(0, 8)
				: 'USD';
		const notes =
			typeof row.notes === 'string' && row.notes.trim() ? row.notes.trim().slice(0, 2000) : null;
		const sort_order =
			typeof row.sort_order === 'number' && Number.isFinite(row.sort_order)
				? Math.floor(row.sort_order)
				: i;

		normalized.push({
			name: name.slice(0, 500),
			category: cat,
			unit,
			price,
			currency,
			notes,
			sort_order,
		});
	}

	return { ok: true as const, normalized };
}

/** GET /api/provider/onboarding/services */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;

	const sb = getSupabaseAdmin();
	const { data: profile } = await sb
		.from('profiles')
		.select('provider_org_id')
		.eq('id', ctx.userId)
		.maybeSingle();

	const orgId = profile?.provider_org_id as string | null | undefined;
	if (!orgId) {
		return NextResponse.json({ error: 'Complete practice details first (no provider_org_id).' }, { status: 400 });
	}

	const { data, error } = await sb
		.from('provider_services')
		.select(
			'id,name,category,unit,price,currency,notes,is_active,sort_order,provider_id,created_at,updated_at',
		)
		.eq('provider_id', orgId)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });

	if (error) {
		console.error('[onboarding/services GET]', error.message);
		return NextResponse.json({ error: 'Failed to load services' }, { status: 500 });
	}

	return NextResponse.json({ items: data || [] });
}

/** PUT /api/provider/onboarding/services — replace all rows for linked org */
export async function PUT(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: { items?: IncomingItem[] } = {};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		body = {};
	}

	const sb = getSupabaseAdmin();
	const { data: profile } = await sb
		.from('profiles')
		.select('provider_org_id')
		.eq('id', ctx.userId)
		.maybeSingle();

	const orgId = profile?.provider_org_id as string | null | undefined;
	if (!orgId) {
		return NextResponse.json({ error: 'Complete practice details first (no provider_org_id).' }, { status: 400 });
	}

	const rawItems = Array.isArray(body.items) ? body.items : [];
	const parsed = normalizeItems(rawItems);
	if (!parsed.ok) {
		return NextResponse.json({ error: parsed.error }, { status: parsed.status });
	}

	const { error: delErr } = await sb.from('provider_services').delete().eq('provider_id', orgId);

	if (delErr) {
		console.error('[onboarding/services PUT] delete', delErr.message);
		return NextResponse.json({ error: 'Failed to replace services' }, { status: 500 });
	}

	if (parsed.normalized.length === 0) {
		return NextResponse.json({ ok: true, saved: 0, items: [] });
	}

	const insertRows = parsed.normalized.map((r) => ({
		provider_id: orgId,
		name: r.name,
		category: r.category,
		unit: r.unit,
		price: r.price,
		currency: r.currency,
		notes: r.notes,
		is_active: true,
		sort_order: r.sort_order,
	}));

	const { data: inserted, error: insErr } = await sb.from('provider_services').insert(insertRows).select('*');

	if (insErr) {
		console.error('[onboarding/services PUT] insert', insErr.message);
		return NextResponse.json({ error: 'Failed to save services' }, { status: 500 });
	}

	return NextResponse.json({ ok: true, saved: inserted?.length ?? 0, items: inserted ?? [] });
}
