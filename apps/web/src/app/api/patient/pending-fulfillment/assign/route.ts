import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import {
	FULFILLMENT_MODE_ASSIGNED,
	FULFILLMENT_MODE_PATIENT_CHOICE,
} from '@/lib/consultationFulfillment';
import {
	fulfillmentOrgKind,
	isBookableFulfillmentOrg,
	type FulfillmentPartnerKind,
} from '@/server/provider/listFulfillmentPartners';
import { assignPendingActionToProvider } from '@/server/patient/assignPendingActionToProvider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KIND_TO_ROUTED: Record<FulfillmentPartnerKind, 'pharmacist' | 'laboratory'> = {
	pharmacy: 'pharmacist',
	laboratory: 'laboratory',
};

/** POST /api/patient/pending-fulfillment/assign */
export async function POST(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	let body: {
		fulfillment_org_id?: string;
		queue_item_ids?: string[];
		kind?: FulfillmentPartnerKind;
		consultation_action_item_id?: string;
		booking_appointment_id?: string;
	};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const fulfillmentOrgId = typeof body.fulfillment_org_id === 'string' ? body.fulfillment_org_id.trim() : '';
	const kind = body.kind;
	const consultationActionItemId =
		typeof body.consultation_action_item_id === 'string' ? body.consultation_action_item_id.trim() : '';
	if (!fulfillmentOrgId) {
		return NextResponse.json({ error: 'fulfillment_org_id is required' }, { status: 400 });
	}
	if (kind !== 'pharmacy' && kind !== 'laboratory') {
		return NextResponse.json({ error: 'kind must be pharmacy or laboratory' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();

	if (consultationActionItemId) {
		try {
			const result = await assignPendingActionToProvider(sb, {
				patientUserId: uid,
				fulfillmentOrgId,
				consultationActionItemId,
				bookingAppointmentId: body.booking_appointment_id || null,
			});
			return NextResponse.json({
				ok: true,
				assigned: result.assigned ? 1 : 0,
				fulfillment_org_id: fulfillmentOrgId,
				queue_item_id: result.queue_item_id,
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Failed to assign action';
			return NextResponse.json({ error: msg }, { status: 400 });
		}
	}

	const bookable = await isBookableFulfillmentOrg(fulfillmentOrgId, kind);
	if (!bookable) {
		return NextResponse.json({ error: 'Invalid service provider for this specialty' }, { status: 400 });
	}

	const orgKind = await fulfillmentOrgKind(fulfillmentOrgId);
	if (orgKind !== kind) {
		return NextResponse.json({ error: 'Provider specialty does not match order type' }, { status: 400 });
	}

	const routedTo = KIND_TO_ROUTED[kind];
	const ids = Array.isArray(body.queue_item_ids)
		? body.queue_item_ids.filter((id) => typeof id === 'string' && id.trim())
		: [];

	let query = sb
		.from('provider_service_queue_items')
		.select('id')
		.eq('patient_user_id', uid)
		.eq('assignment_mode', FULFILLMENT_MODE_PATIENT_CHOICE)
		.is('fulfillment_org_id', null)
		.eq('routed_to', routedTo)
		.in('status', ['pending', 'in_progress']);

	if (ids.length) {
		query = query.in('id', ids);
	}

	const { data: rows, error: selErr } = await query;
	if (selErr) {
		console.error('[api/patient/pending-fulfillment/assign] select', selErr.message);
		return NextResponse.json({ error: selErr.message }, { status: 500 });
	}

	if (!rows?.length) {
		return NextResponse.json({ ok: true, assigned: 0 });
	}

	const rowIds = rows.map((r: { id: string }) => r.id);
	const { data: org } = await sb.from('providers').select('name, provider_name').eq('id', fulfillmentOrgId).maybeSingle();
	const orgName =
		(org as { provider_name?: string; name?: string } | null)?.provider_name ||
		(org as { provider_name?: string; name?: string } | null)?.name ||
		null;

	const { error: upErr } = await sb
		.from('provider_service_queue_items')
		.update({
			fulfillment_org_id: fulfillmentOrgId,
			assignment_mode: FULFILLMENT_MODE_ASSIGNED,
			updated_at: new Date().toISOString(),
		})
		.in('id', rowIds);

	if (upErr) {
		console.error('[api/patient/pending-fulfillment/assign] update', upErr.message);
		return NextResponse.json({ error: upErr.message }, { status: 500 });
	}

	for (const id of rowIds) {
		const { data: item } = await sb.from('provider_service_queue_items').select('payload').eq('id', id).maybeSingle();
		if (!item) continue;
		const payload =
			item.payload && typeof item.payload === 'object' && !Array.isArray(item.payload)
				? { ...(item.payload as Record<string, unknown>) }
				: {};
		payload.fulfillment_org_id = fulfillmentOrgId;
		payload.fulfillment_org_name = orgName;
		payload.fulfillment_mode = FULFILLMENT_MODE_ASSIGNED;
		await sb.from('provider_service_queue_items').update({ payload }).eq('id', id);
	}

	return NextResponse.json({ ok: true, assigned: rowIds.length, fulfillment_org_id: fulfillmentOrgId });
}
