import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function assertOwnService(sb: ReturnType<typeof getSupabaseAdmin>, orgId: string, id: string) {
	const { data, error } = await sb
		.from('provider_services')
		.select('id')
		.eq('id', id)
		.eq('provider_id', orgId)
		.maybeSingle();
	if (error) return { ok: false as const, status: 500 as const, error: error.message };
	if (!data) return { ok: false as const, status: 404 as const, error: 'Not found' };
	return { ok: true as const };
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const auth = await requireProvider(request);
	if (auth instanceof NextResponse) return auth;
	if (!auth.providerOrgId) return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });

	const { id } = await ctx.params;
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const sb = getSupabaseAdmin();
	const gate = await assertOwnService(sb, auth.providerOrgId, id);
	if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

	const patch: Record<string, unknown> = {};
	if (typeof body.name === 'string') patch.name = body.name.trim();
	if (body.category !== undefined && body.category != null) patch.category = String(body.category).trim();
	if (body.unit !== undefined && body.unit != null) patch.unit = String(body.unit).trim();
	if (typeof body.price === 'number' && Number.isFinite(body.price)) patch.price = Math.max(0, body.price);
	if (body.notes !== undefined) patch.notes = body.notes == null ? null : String(body.notes).trim() || null;
	if (typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)) patch.sort_order = Math.floor(body.sort_order);
	if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;

	if (Object.keys(patch).length === 0) {
		return NextResponse.json({ error: 'No updatable fields' }, { status: 400 });
	}

	const { data, error } = await sb.from('provider_services').update(patch).eq('id', id).select().single();
	if (error) {
		console.error('[api/provider/catalog/services/:id PATCH]', error.message);
		return NextResponse.json({ error: 'Update failed' }, { status: 500 });
	}
	return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	void request;
	const auth = await requireProvider(request);
	if (auth instanceof NextResponse) return auth;
	if (!auth.providerOrgId) return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });

	const { id } = await ctx.params;
	const sb = getSupabaseAdmin();
	const gate = await assertOwnService(sb, auth.providerOrgId, id);
	if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

	const { error } = await sb.from('provider_services').delete().eq('id', id);
	if (error) {
		console.error('[api/provider/catalog/services/:id DELETE]', error.message);
		return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
	}
	return NextResponse.json({ ok: true });
}
