import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function assertOwnTemplate(sb: ReturnType<typeof getSupabaseAdmin>, orgId: string, id: string) {
	const { data, error } = await sb
		.from('provider_prescription_templates')
		.select('id')
		.eq('id', id)
		.eq('provider_org_id', orgId)
		.maybeSingle();
	if (error) return { ok: false as const, status: 500 as const, error: error.message };
	if (!data) return { ok: false as const, status: 404 as const, error: 'Not found' };
	return { ok: true as const };
}

function normalizeLines(raw: unknown) {
	if (!Array.isArray(raw)) return null;
	const lines = raw
		.filter((x) => x && typeof x === 'object')
		.map((x) => {
			const row = x as Record<string, unknown>;
			const name = String(row.medication_name || '').trim();
			if (!name) return null;
			return {
				medication_name: name,
				strength: row.strength != null ? String(row.strength) : '',
				dose: row.dose != null ? String(row.dose) : '',
				route: row.route != null ? String(row.route) : 'oral',
				frequency: row.frequency != null ? String(row.frequency) : '',
				duration_days: row.duration_days != null ? String(row.duration_days) : '',
				quantity: row.quantity != null ? String(row.quantity) : '',
				refills: row.refills != null ? String(row.refills) : '0',
				sig: row.sig != null ? String(row.sig) : '',
				catalog_id: row.catalog_id || null,
			};
		})
		.filter(Boolean);
	return lines.length ? lines : null;
}

/** PATCH — update template. */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const auth = await requireProvider(request);
	if (auth instanceof NextResponse) return auth;
	if (!auth.providerOrgId) return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });

	const { id } = await ctx.params;
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const sb = getSupabaseAdmin();

	const gate = await assertOwnTemplate(sb, auth.providerOrgId, id);
	if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

	const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (typeof body.name === 'string') {
		const name = body.name.trim();
		if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
		patch.name = name;
	}
	if (body.description !== undefined) {
		patch.description = body.description == null ? null : String(body.description).trim() || null;
	}
	if (body.lines !== undefined) {
		const lines = normalizeLines(body.lines);
		if (!lines) return NextResponse.json({ error: 'At least one medication line is required' }, { status: 400 });
		patch.lines = lines;
	}
	if (typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)) {
		patch.sort_order = Math.floor(body.sort_order);
	}
	if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;

	const { data, error } = await sb.from('provider_prescription_templates').update(patch).eq('id', id).select().single();
	if (error) {
		return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
	}
	return NextResponse.json({ ok: true, item: data });
}

/** DELETE — remove template. */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const auth = await requireProvider(request);
	if (auth instanceof NextResponse) return auth;
	if (!auth.providerOrgId) return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });

	const { id } = await ctx.params;
	const sb = getSupabaseAdmin();
	const gate = await assertOwnTemplate(sb, auth.providerOrgId, id);
	if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

	const { error } = await sb.from('provider_prescription_templates').delete().eq('id', id);
	if (error) {
		return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
	}
	return NextResponse.json({ ok: true });
}
