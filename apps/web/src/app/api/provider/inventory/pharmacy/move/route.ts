import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getPharmacyAccessForOrg } from '@/server/provider/practiceRole';
import { notifyLowStockIfNeeded } from '@/server/provider/inventoryLowStock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type MoveReason = 'addition' | 'reduction' | 'adjustment' | 'restock';

function normalizeReason(raw: string): MoveReason | null {
	const r = raw.trim().toLowerCase();
	if (r === 'restock') return 'addition';
	if (r === 'addition' || r === 'reduction' || r === 'adjustment') return r;
	return null;
}

/**
 * POST /api/provider/inventory/pharmacy/move
 * Record stock change: addition (positive), reduction (negative), or adjustment (signed via adjustment_direction).
 */
export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	const orgId = ctx.providerOrgId;
	if (!orgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const access = await getPharmacyAccessForOrg(sb, orgId);
	if (!access.isPharmacy) {
		return NextResponse.json({ error: 'Pharmacy inventory is only available for pharmacist practices.' }, { status: 403 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		drug_catalog_id?: string;
		delta_qty?: number;
		reason?: string;
		adjustment_direction?: string;
		notes?: string | null;
	};

	const drugId = String(body.drug_catalog_id || '').trim();
	const delta = typeof body.delta_qty === 'number' && Number.isFinite(body.delta_qty) ? Math.trunc(body.delta_qty) : NaN;
	const reason = normalizeReason(String(body.reason || ''));
	const notes = body.notes != null ? String(body.notes).trim() || null : null;
	const adjustmentDirection = String(body.adjustment_direction || 'add').trim().toLowerCase();

	if (!drugId) return NextResponse.json({ error: 'drug_catalog_id is required' }, { status: 400 });
	if (!reason) {
		return NextResponse.json(
			{ error: 'reason must be addition, reduction, or adjustment (restock is accepted as addition)' },
			{ status: 400 },
		);
	}

	if (!Number.isFinite(delta) || delta === 0) {
		return NextResponse.json({ error: 'delta_qty must be a non-zero integer' }, { status: 400 });
	}

	if (reason === 'addition' && delta < 0) {
		return NextResponse.json({ error: 'Stock addition must use a positive delta_qty' }, { status: 400 });
	}
	if (reason === 'reduction' && delta > 0) {
		return NextResponse.json({ error: 'Stock reduction must use a negative delta_qty' }, { status: 400 });
	}
	if (reason === 'adjustment' && adjustmentDirection !== 'add' && adjustmentDirection !== 'reduce') {
		return NextResponse.json({ error: 'adjustment_direction must be add or reduce when reason is adjustment' }, { status: 400 });
	}

	const storedReason = reason;

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

	const movementNotes =
		reason === 'adjustment' && notes
			? `[${adjustmentDirection === 'reduce' ? 'Reduction' : 'Addition'}] ${notes}`
			: reason === 'adjustment'
				? `[${adjustmentDirection === 'reduce' ? 'Reduction' : 'Addition'}]`
				: notes;

	const { data: movement, error: mErr } = await sb
		.from('provider_pharmacy_stock_movements')
		.insert({
			provider_org_id: orgId,
			drug_catalog_id: drugId,
			delta_qty: delta,
			reason: storedReason,
			reference_invoice_id: null,
			notes: movementNotes,
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
