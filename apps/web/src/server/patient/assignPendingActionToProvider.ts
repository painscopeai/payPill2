import type { SupabaseClient } from '@supabase/supabase-js';
import {
	FULFILLMENT_MODE_ASSIGNED,
	mergeFulfillmentIntoPayload,
	type SectionFulfillment,
} from '@/lib/consultationFulfillment';
import {
	fulfillmentOrgKind,
	type FulfillmentPartnerKind,
} from '@/server/provider/listFulfillmentPartners';

const KIND_TO_ROUTED: Record<FulfillmentPartnerKind, 'pharmacist' | 'laboratory'> = {
	pharmacy: 'pharmacist',
	laboratory: 'laboratory',
};

const ITEM_TYPE_TO_KIND: Record<string, FulfillmentPartnerKind> = {
	prescription: 'pharmacy',
	lab: 'laboratory',
};

export type AssignPendingActionResult = {
	assigned: boolean;
	queue_item_id: string | null;
};

/**
 * Route a pending consultation action to the pharmacy or lab the patient booked with.
 */
export async function assignPendingActionToProvider(
	sb: SupabaseClient,
	opts: {
		patientUserId: string;
		fulfillmentOrgId: string;
		consultationActionItemId: string;
		bookingAppointmentId?: string | null;
	},
): Promise<AssignPendingActionResult> {
	const { patientUserId, fulfillmentOrgId, consultationActionItemId, bookingAppointmentId } = opts;

	const { data: action, error: actErr } = await sb
		.from('patient_consultation_action_items')
		.select('id, encounter_id, appointment_id, item_type, source_line_id, line_index, payload, status, patient_user_id')
		.eq('id', consultationActionItemId)
		.eq('patient_user_id', patientUserId)
		.maybeSingle();

	if (actErr) {
		if (/does not exist|schema cache/i.test(actErr.message)) {
			return { assigned: false, queue_item_id: null };
		}
		throw actErr;
	}
	if (!action || action.status !== 'pending') {
		return { assigned: false, queue_item_id: null };
	}

	const itemType = String(action.item_type || '');
	const expectedKind = ITEM_TYPE_TO_KIND[itemType];
	if (!expectedKind) {
		throw new Error('Unsupported action item type');
	}

	const orgKind = await fulfillmentOrgKind(fulfillmentOrgId);
	if (orgKind !== expectedKind) {
		throw new Error('Selected provider does not match this action plan type');
	}

	const routedTo = KIND_TO_ROUTED[expectedKind];
	const queueItemType = itemType === 'prescription' ? 'prescription' : 'lab';

	const { data: enc, error: encErr } = await sb
		.from('provider_consultation_encounters')
		.select('id, appointment_id, patient_user_id, provider_user_id')
		.eq('id', action.encounter_id)
		.maybeSingle();
	if (encErr) throw encErr;
	if (!enc) return { assigned: false, queue_item_id: null };

	const { data: clinicalProfile } = await sb
		.from('profiles')
		.select('provider_org_id')
		.eq('id', enc.provider_user_id)
		.maybeSingle();
	const clinicalOrgId = (clinicalProfile as { provider_org_id?: string | null } | null)?.provider_org_id;
	if (!clinicalOrgId) {
		throw new Error('Clinical practice is not linked for this consultation');
	}

	const { data: org } = await sb
		.from('providers')
		.select('name, provider_name')
		.eq('id', fulfillmentOrgId)
		.maybeSingle();
	const orgName =
		(org as { provider_name?: string; name?: string } | null)?.provider_name ||
		(org as { provider_name?: string; name?: string } | null)?.name ||
		null;

	const basePayload =
		action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
			? { ...(action.payload as Record<string, unknown>) }
			: {};
	const fulfillmentSection: SectionFulfillment = {
		mode: FULFILLMENT_MODE_ASSIGNED,
		fulfillment_org_id: fulfillmentOrgId,
		fulfillment_org_name: orgName,
	};
	const payload = mergeFulfillmentIntoPayload(basePayload, fulfillmentSection);
	if (bookingAppointmentId) {
		payload.booking_appointment_id = bookingAppointmentId;
	}

	const { data: existingQueue } = await sb
		.from('provider_service_queue_items')
		.select('id, status')
		.eq('encounter_id', action.encounter_id)
		.eq('source_line_id', action.source_line_id)
		.maybeSingle();

	let queueItemId: string;

	if (existingQueue) {
		queueItemId = (existingQueue as { id: string }).id;
		const st = (existingQueue as { status: string }).status;
		if (st !== 'pending' && st !== 'in_progress') {
			return { assigned: false, queue_item_id: queueItemId };
		}
		const { error: upErr } = await sb
			.from('provider_service_queue_items')
			.update({
				fulfillment_org_id: fulfillmentOrgId,
				assignment_mode: FULFILLMENT_MODE_ASSIGNED,
				routed_to: routedTo,
				payload,
				updated_at: new Date().toISOString(),
			})
			.eq('id', queueItemId);
		if (upErr) throw upErr;
	} else {
		const { data: inserted, error: insErr } = await sb
			.from('provider_service_queue_items')
			.insert({
				encounter_id: action.encounter_id,
				appointment_id: action.appointment_id,
				patient_user_id: patientUserId,
				clinical_org_id: clinicalOrgId,
				clinical_provider_user_id: enc.provider_user_id,
				item_type: queueItemType,
				routed_to: routedTo,
				source_line_id: action.source_line_id,
				line_index: action.line_index ?? 0,
				payload,
				status: 'pending',
				assignment_mode: FULFILLMENT_MODE_ASSIGNED,
				fulfillment_org_id: fulfillmentOrgId,
			})
			.select('id')
			.single();
		if (insErr) {
			if (/does not exist|schema cache/i.test(insErr.message)) {
				return { assigned: false, queue_item_id: null };
			}
			throw insErr;
		}
		queueItemId = (inserted as { id: string }).id;
	}

	return { assigned: true, queue_item_id: queueItemId };
}
