import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function assertOwnLab(sb: ReturnType<typeof getSupabaseAdmin>, orgId: string, id: string) {
	const { data, error } = await sb
		.from('provider_lab_test_catalog')
		.select('id')
		.eq('id', id)
		.eq('provider_org_id', orgId)
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
	const gate = await assertOwnLab(sb, auth.providerOrgId, id);
	if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

	const patch: Record<string, unknown> = {};
	if (typeof body.test_name === 'string') patch.test_name = body.test_name.trim();
	if (body.code !== undefined) patch.code = body.code == null ? null : String(body.code).trim() || null;
	if (body.category !== undefined) patch.category = body.category == null ? null : String(body.category).trim() || null;
	if (body.notes !== undefined) patch.notes = body.notes == null ? null : String(body.notes).trim() || null;
	if (typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)) patch.sort_order = Math.floor(body.sort_order);
	if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;

	if (Object.keys(patch).length === 0) {
		return NextResponse.json({ error: 'No updatable fields' }, { status: 400 });
	}

	const { data, error } = await sb.from('provider_lab_test_catalog').update(patch).eq('id', id).select().single();
	if (error) {
		console.error('[api/provider/catalog/labs/:id PATCH]', error.message);
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
	const gate = await assertOwnLab(sb, auth.providerOrgId, id);
	if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

	const { error } = await sb.from('provider_lab_test_catalog').delete().eq('id', id);
	if (error) {
		console.error('[api/provider/catalog/labs/:id DELETE]', error.message);
		return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
	}
	return NextResponse.json({ ok: true });
}
