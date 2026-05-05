import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { auditLog } from '@/server/express-api/middleware/rbac.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CATEGORIES = new Set(['service', 'drug', 'other']);
const UNITS = new Set(['per_visit', 'per_dose', 'flat', 'monthly']);

export async function GET(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const providerId = url.searchParams.get('providerId')?.trim() || '';
	const applicationId = url.searchParams.get('providerApplicationId')?.trim() || '';

	if ((providerId && applicationId) || (!providerId && !applicationId)) {
		return NextResponse.json(
			{ error: 'Provide exactly one of providerId or providerApplicationId' },
			{ status: 400 },
		);
	}
	if (providerId && !UUID_RE.test(providerId)) {
		return NextResponse.json({ error: 'Invalid providerId' }, { status: 400 });
	}
	if (applicationId && !UUID_RE.test(applicationId)) {
		return NextResponse.json({ error: 'Invalid providerApplicationId' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	let q = sb
		.from('provider_services')
		.select(
			'id,name,category,unit,price,currency,notes,is_active,sort_order,provider_application_id,provider_id,created_at,updated_at',
		)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });

	if (providerId) {
		const { data: apps, error: appErr } = await sb
			.from('provider_applications')
			.select('id')
			.eq('provider_id', providerId);
		if (appErr) {
			console.error('[admin/provider-services GET] applications', appErr.message);
			return NextResponse.json({ error: 'Failed to load services' }, { status: 500 });
		}
		const appIds = (apps || []).map((a: { id: string }) => a.id).filter(Boolean);
		if (appIds.length > 0) {
			q = q.or(`provider_id.eq.${providerId},provider_application_id.in.(${appIds.join(',')})`);
		} else {
			q = q.eq('provider_id', providerId);
		}
	} else {
		q = q.eq('provider_application_id', applicationId);
	}

	const { data, error } = await q;
	if (error) {
		console.error('[admin/provider-services GET]', error.message);
		return NextResponse.json({ error: 'Failed to load services' }, { status: 500 });
	}

	return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const provider_id = typeof body.provider_id === 'string' ? body.provider_id.trim() : '';
	if (!provider_id || !UUID_RE.test(provider_id)) {
		return NextResponse.json({ error: 'provider_id is required (uuid)' }, { status: 400 });
	}

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	if (!name) {
		return NextResponse.json({ error: 'name is required' }, { status: 400 });
	}

	const category = typeof body.category === 'string' ? body.category.trim() : 'service';
	if (!CATEGORIES.has(category)) {
		return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
	}
	const unit = typeof body.unit === 'string' ? body.unit.trim() : 'per_visit';
	if (!UNITS.has(unit)) {
		return NextResponse.json({ error: 'Invalid unit' }, { status: 400 });
	}

	const priceRaw = body.price;
	const price =
		typeof priceRaw === 'number'
			? priceRaw
			: typeof priceRaw === 'string'
				? Number.parseFloat(priceRaw)
				: NaN;
	if (!Number.isFinite(price) || price < 0) {
		return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
	}

	const currency =
		typeof body.currency === 'string' && body.currency.trim()
			? body.currency.trim().toUpperCase().slice(0, 8)
			: 'USD';
	const notes =
		typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 2000) : null;
	const sort_order =
		typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)
			? Math.floor(body.sort_order)
			: 0;
	const is_active = typeof body.is_active === 'boolean' ? body.is_active : true;

	const sb = getSupabaseAdmin();

	const { data: prov, error: pErr } = await sb.from('providers').select('id').eq('id', provider_id).maybeSingle();
	if (pErr || !prov) {
		return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
	}

	const row = {
		provider_id,
		provider_application_id: null as string | null,
		name: name.slice(0, 500),
		category,
		unit,
		price,
		currency,
		notes,
		is_active,
		sort_order,
	};

	const { data: inserted, error: insErr } = await sb.from('provider_services').insert(row).select('*').single();
	if (insErr) {
		console.error('[admin/provider-services POST]', insErr.message);
		return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
	}

	await auditLog({
		adminId: ctx.adminId,
		action: 'CREATE_PROVIDER_SERVICE',
		resourceType: 'provider_service',
		resourceId: inserted.id,
		changes: { provider_id, name },
		ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	});

	return NextResponse.json({ item: inserted }, { status: 201 });
}
