import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getPracticeRoleSlugForOrg } from '@/server/provider/practiceRole';
import { notifyLowStockIfNeeded } from '@/server/provider/inventoryLowStock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type MoveReason = 'restock' | 'adjustment';

/**
 * POST /api/provider/inventory/pharmacy/move
 * Adjust on-hand quantity with audit row. `restock` uses positive delta; `adjustment` may be negative.
 */
export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	const orgId = ctx.providerOrgId;
	if (!orgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const roleSlug = await getPracticeRoleSlugForOrg(sb, orgId);
	if (roleSlug !== 'pharmacist') {
		return NextResponse.json({ error: 'Pharmacy inventory is only available for pharmacist practices.' }, { status: 403 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		drug_catalog_id?: string;
		delta_qty?: number;
		reason?: string;
		notes?: string | null;
	};

	const drugId = String(body.drug_catalog_id || '').trim();
	const delta = typeof body.delta_qty === 'number' && Number.isFinite(body.delta_qty) ? Math.trunc(body.delta_qty) : NaN;
	const reason = String(body.reason || '').trim() as MoveReason;
	const notes = body.notes != null ? String(body.notes).trim() || null : null;

	if (!drugId) return NextResponse.json({ error: 'drug_catalog_id is required' }, { status: 400 });
	if (!Number.isFinite(delta) || delta === 0) {
		return NextResponse.json({ error: 'delta_qty must be a non-zero integer' }, { status: 400 });
	}
	if (reason !== 'restock' && reason !== 'adjustment') {
		return NextResponse.json({ error: 'reason must be restock or adjustment' }, { status: 400 });
	}
	if (reason === 'restock' && delta < 0) {
		return NextResponse.json({ error: 'Restock must use a positive delta_qty' }, { status: 400 });
	}

	const { data: row, error: gErr } = await sb
		.from('provider_drug_catalog')
		.select('id, quantity_on_hand, provider_org_id')
		.eq('id', drugId)
		.eq('provider_org_id', orgId)
		.maybeSingle();
	if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });
	if (!row) return NextResponse.json({ error: 'Drug not found in your catalog' }, { status: 404 });

	const current = typeof row.quantity_on_hand === 'number' ? row.quantity_on_hand : 0;
	const next = current + delta;
	if (next < 0) {
		return NextResponse.json({ error: 'Resulting quantity cannot be negative' }, { status: 400 });
	}

	const { data: movement, error: mErr } = await sb
		.from('provider_pharmacy_stock_movements')
		.insert({
			provider_org_id: orgId,
			drug_catalog_id: drugId,
			delta_qty: delta,
			reason,
			reference_invoice_id: null,
			notes,
			created_by: ctx.userId,
		})
		.select('id')
		.single();
	if (mErr) {
		console.error('[inventory/pharmacy/move]', mErr.message);
		return NextResponse.json({ error: 'Failed to record movement' }, { status: 500 });
	}

	const movementId = movement?.id as string | undefined;
	const { data: updated, error: uErr } = await sb
		.from('provider_drug_catalog')
		.update({ quantity_on_hand: next, updated_at: new Date().toISOString() })
		.eq('id', drugId)
		.select('*')
		.single();
	if (uErr) {
		console.error('[inventory/pharmacy/move update]', uErr.message);
		if (movementId) {
			await sb.from('provider_pharmacy_stock_movements').delete().eq('id', movementId);
		}
		return NextResponse.json({ error: 'Failed to update quantity' }, { status: 500 });
	}

	await notifyLowStockIfNeeded(sb, orgId, [drugId]);

	return NextResponse.json({ ok: true, item: updated });
}
