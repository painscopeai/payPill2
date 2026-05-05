import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getProviderApplication } from '@/server/admin/providerApplicationService';
import { verifyProviderApplicationInviteToken } from '@/server/utils/providerApplicationInvite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATEGORIES = new Set(['service', 'drug', 'other']);
const UNITS = new Set(['per_visit', 'per_dose', 'flat', 'monthly']);

function parseToken(request: NextRequest): string {
	const url = new URL(request.url);
	const q = url.searchParams.get('application_token')?.trim();
	if (q) return q;
	return '';
}

export async function GET(request: NextRequest) {
	const token = parseToken(request);
	if (!token) {
		return NextResponse.json({ error: 'Missing application_token' }, { status: 400 });
	}

	let payload;
	try {
		payload = verifyProviderApplicationInviteToken(token);
	} catch (e) {
		const status = typeof e === 'object' && e !== null && 'status' in e ? (e as { status: number }).status : 400;
		const msg = e instanceof Error ? e.message : 'Invalid token';
		return NextResponse.json({ error: msg }, { status });
	}

	const app = await getProviderApplication(payload.applicationId);
	if (!app) {
		return NextResponse.json({ error: 'Application not found' }, { status: 404 });
	}

	if (app.status === 'invited') {
		return NextResponse.json(
			{
				error: 'complete_questionnaire_first',
				message: 'Submit the questionnaire first, then add your services and pricing.',
				formId: payload.formId,
			},
			{ status: 409 },
		);
	}

	if (app.status !== 'submitted' && app.status !== 'approved') {
		return NextResponse.json({ error: 'Application is not eligible for service list updates' }, { status: 403 });
	}

	const readOnly = app.status === 'approved';

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_services')
		.select(
			'id,name,category,unit,price,currency,notes,is_active,sort_order,provider_application_id,provider_id,created_at,updated_at',
		)
		.eq('provider_application_id', app.id)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });

	if (error) {
		console.error('[provider-onboarding/services GET]', error.message);
		return NextResponse.json({ error: 'Failed to load services' }, { status: 500 });
	}

	return NextResponse.json({
		items: data || [],
		applicationStatus: app.status,
		readOnly,
		organizationName: app.organization_name || '',
	});
}

type IncomingItem = {
	name?: unknown;
	category?: unknown;
	unit?: unknown;
	price?: unknown;
	currency?: unknown;
	notes?: unknown;
	sort_order?: unknown;
};

export async function POST(request: NextRequest) {
	let body: { items?: IncomingItem[]; application_token?: string } = {};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		body = {};
	}

	const urlToken = new URL(request.url).searchParams.get('application_token')?.trim() || '';
	const token =
		urlToken || (typeof body.application_token === 'string' ? body.application_token.trim() : '');
	if (!token) {
		return NextResponse.json({ error: 'Missing application_token (query or JSON body)' }, { status: 400 });
	}

	let payload;
	try {
		payload = verifyProviderApplicationInviteToken(token);
	} catch (e) {
		const status = typeof e === 'object' && e !== null && 'status' in e ? (e as { status: number }).status : 400;
		const msg = e instanceof Error ? e.message : 'Invalid token';
		return NextResponse.json({ error: msg }, { status });
	}

	const app = await getProviderApplication(payload.applicationId);
	if (!app) {
		return NextResponse.json({ error: 'Application not found' }, { status: 404 });
	}

	if (app.status !== 'submitted') {
		return NextResponse.json(
			{ error: 'Services can only be edited while your application is awaiting review.' },
			{ status: 403 },
		);
	}

	const rawItems = Array.isArray(body.items) ? body.items : [];
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
			return NextResponse.json({ error: `Invalid category on row ${i + 1}` }, { status: 400 });
		}
		const unit = typeof row.unit === 'string' ? row.unit.trim() : 'per_visit';
		if (!UNITS.has(unit)) {
			return NextResponse.json({ error: `Invalid unit on row ${i + 1}` }, { status: 400 });
		}
		const priceRaw = row.price;
		const price =
			typeof priceRaw === 'number'
				? priceRaw
				: typeof priceRaw === 'string'
					? Number.parseFloat(priceRaw)
					: NaN;
		if (!Number.isFinite(price) || price < 0) {
			return NextResponse.json({ error: `Invalid price on row ${i + 1}` }, { status: 400 });
		}

		const currency =
			typeof row.currency === 'string' && row.currency.trim() ? row.currency.trim().toUpperCase().slice(0, 8) : 'USD';
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

	const sb = getSupabaseAdmin();

	const { error: delErr } = await sb
		.from('provider_services')
		.delete()
		.eq('provider_application_id', app.id)
		.is('provider_id', null);

	if (delErr) {
		console.error('[provider-onboarding/services POST] delete', delErr.message);
		return NextResponse.json({ error: 'Failed to replace services' }, { status: 500 });
	}

	if (normalized.length === 0) {
		return NextResponse.json({ ok: true, saved: 0, items: [] });
	}

	const insertRows = normalized.map((r) => ({
		provider_application_id: app.id,
		provider_id: null as string | null,
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
		console.error('[provider-onboarding/services POST] insert', insErr.message);
		return NextResponse.json({ error: 'Failed to save services' }, { status: 500 });
	}

	return NextResponse.json({ ok: true, saved: inserted?.length ?? 0, items: inserted ?? [] });
}
