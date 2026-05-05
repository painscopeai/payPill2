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

function errResponse(e: unknown, fallback = 500) {
	const msg = e instanceof Error ? e.message : 'Server error';
	const status =
		typeof e === 'object' && e !== null && 'status' in e && typeof (e as { status: unknown }).status === 'number'
			? (e as { status: number }).status
			: fallback;
	return NextResponse.json({ error: msg }, { status });
}

export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await context.params;
	if (!id?.trim() || !UUID_RE.test(id)) {
		return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

	if (body.name !== undefined) {
		if (typeof body.name !== 'string' || !body.name.trim()) {
			return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
		}
		updates.name = body.name.trim().slice(0, 500);
	}
	if (body.category !== undefined) {
		const c = typeof body.category === 'string' ? body.category.trim() : '';
		if (!CATEGORIES.has(c)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
		updates.category = c;
	}
	if (body.unit !== undefined) {
		const u = typeof body.unit === 'string' ? body.unit.trim() : '';
		if (!UNITS.has(u)) return NextResponse.json({ error: 'Invalid unit' }, { status: 400 });
		updates.unit = u;
	}
	if (body.price !== undefined) {
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
		updates.price = price;
	}
	if (body.currency !== undefined) {
		if (typeof body.currency !== 'string' || !body.currency.trim()) {
			return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
		}
		updates.currency = body.currency.trim().toUpperCase().slice(0, 8);
	}
	if (body.notes !== undefined) {
		updates.notes =
			body.notes === null
				? null
				: typeof body.notes === 'string'
					? body.notes.trim().slice(0, 2000) || null
					: null;
	}
	if (body.is_active !== undefined) {
		if (typeof body.is_active !== 'boolean') {
			return NextResponse.json({ error: 'is_active must be boolean' }, { status: 400 });
		}
		updates.is_active = body.is_active;
	}
	if (body.sort_order !== undefined) {
		if (typeof body.sort_order !== 'number' || !Number.isFinite(body.sort_order)) {
			return NextResponse.json({ error: 'Invalid sort_order' }, { status: 400 });
		}
		updates.sort_order = Math.floor(body.sort_order);
	}

	const sb = getSupabaseAdmin();
	const { data, error } = await sb.from('provider_services').update(updates).eq('id', id).select('*').maybeSingle();
	if (error) {
		console.error('[admin/provider-services PATCH]', error.message);
		return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
	}
	if (!data) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}

	await auditLog({
		adminId: ctx.adminId,
		action: 'UPDATE_PROVIDER_SERVICE',
		resourceType: 'provider_service',
		resourceId: id,
		changes: updates,
		ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	});

	return NextResponse.json({ item: data });
}

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await context.params;
	if (!id?.trim() || !UUID_RE.test(id)) {
		return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const { error } = await sb.from('provider_services').delete().eq('id', id);
	if (error) {
		console.error('[admin/provider-services DELETE]', error.message);
		return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
	}

	await auditLog({
		adminId: ctx.adminId,
		action: 'DELETE_PROVIDER_SERVICE',
		resourceType: 'provider_service',
		resourceId: id,
		changes: {},
		ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	});

	return NextResponse.json({ success: true, id });
}
