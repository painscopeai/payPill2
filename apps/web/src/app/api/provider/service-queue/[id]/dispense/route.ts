import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getPharmacyAccessForOrg } from '@/server/provider/practiceRole';
import { notifyLowStockIfNeeded } from '@/server/provider/inventoryLowStock';
import { completeLinkedFulfillmentAppointments } from '@/server/provider/completeLinkedFulfillmentAppointments';
import {
	claimServiceQueueItemForOrg,
	fetchOrgServiceQueueItem,
} from '@/server/provider/serviceQueueOrgAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/provider/service-queue/:id/dispense — fulfill Rx and deduct pharmacy inventory. */
export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	const orgId = ctx.providerOrgId;
	if (!orgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const access = await getPharmacyAccessForOrg(sb, orgId);
	if (!access.isPharmacy) {
		return NextResponse.json({ error: 'Dispensing is only available for pharmacy practices.' }, { status: 403 });
	}

	const { id } = await context.params;
	const body = (await request.json().catch(() => ({}))) as {
		drug_catalog_id?: string;
		quantity_dispensed?: number;
		notes?: string | null;
	};

	const drugId = String(body.drug_catalog_id || '').trim();
	const qty =
		typeof body.quantity_dispensed === 'number' && Number.isFinite(body.quantity_dispensed)
			? Math.max(1, Math.floor(body.quantity_dispensed))
			: 1;
	const notes = body.notes != null ? String(body.notes).trim() || null : null;

	if (!drugId) {
		return NextResponse.json({ error: 'drug_catalog_id is required' }, { status: 400 });
	}

	let queueItem;
	try {
		queueItem = await fetchOrgServiceQueueItem(sb, { id, orgId, routedTo: 'pharmacist' });
	} catch (qErr) {
		const msg = qErr instanceof Error ? qErr.message : 'Failed to load queue item';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
	if (!queueItem) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
	try {
		await claimServiceQueueItemForOrg(sb, queueItem, orgId);
	} catch (claimErr) {
		const msg = claimErr instanceof Error ? claimErr.message : 'Cannot fulfill this order';
		return NextResponse.json({ error: msg }, { status: 403 });
	}
	if (queueItem.status === 'completed') {
		return NextResponse.json({ error: 'Already dispensed' }, { status: 400 });
	}

	const { data: drug, error: dErr } = await sb
		.from('provider_drug_catalog')
		.select('id, name, quantity_on_hand, provider_org_id')
		.eq('id', drugId)
		.eq('provider_org_id', orgId)
		.maybeSingle();
	if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
	if (!drug) return NextResponse.json({ error: 'Drug not found in your catalog' }, { status: 404 });

	const current = typeof drug.quantity_on_hand === 'number' ? drug.quantity_on_hand : 0;
	if (current < qty) {
		return NextResponse.json(
			{ error: `Insufficient stock (on hand: ${current}, requested: ${qty})` },
			{ status: 400 },
		);
	}

	const next = current - qty;
	const fulfillmentNotes =
		notes ||
		`Dispensed for ${String((queueItem.payload as { medication_name?: string })?.medication_name || 'medication')}`;

	const { data: movement, error: mErr } = await sb
		.from('provider_pharmacy_stock_movements')
		.insert({
			provider_org_id: orgId,
			drug_catalog_id: drugId,
			delta_qty: -qty,
			reason: 'reduction',
			reference_invoice_id: null,
			notes: fulfillmentNotes,
			created_by: ctx.userId,
		})
		.select('id')
		.single();
	if (mErr) {
		console.error('[service-queue/dispense] movement', mErr.message);
		return NextResponse.json({ error: 'Failed to record stock movement' }, { status: 500 });
	}

	const movementId = movement?.id as string;
	const { error: uDrugErr } = await sb
		.from('provider_drug_catalog')
		.update({ quantity_on_hand: next, updated_at: new Date().toISOString() })
		.eq('id', drugId);
	if (uDrugErr) {
		if (movementId) await sb.from('provider_pharmacy_stock_movements').delete().eq('id', movementId);
		return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
	}

	const now = new Date().toISOString();
	const { data: updated, error: uQErr } = await sb
		.from('provider_service_queue_items')
		.update({
			status: 'completed',
			fulfilled_by: ctx.userId,
			fulfilled_at: now,
			fulfillment_notes: fulfillmentNotes,
			drug_catalog_id: drugId,
			quantity_dispensed: qty,
			stock_movement_id: movementId,
			updated_at: now,
		})
		.eq('id', id)
		.select('*')
		.single();
	if (uQErr) {
		return NextResponse.json({ error: uQErr.message }, { status: 500 });
	}

	await notifyLowStockIfNeeded(sb, orgId, [drugId]);

	const linked = await completeLinkedFulfillmentAppointments(sb, queueItem, orgId);

	return NextResponse.json({
		item: updated,
		drug: { ...drug, quantity_on_hand: next },
		completed_appointment_ids: linked.appointmentIds,
	});
}
