import type { SupabaseClient } from '@supabase/supabase-js';
import {
	FULFILLMENT_MODE_ASSIGNED,
	FULFILLMENT_MODE_PATIENT_CHOICE,
	mergeFulfillmentIntoPayload,
	type SectionFulfillment,
} from '@/lib/consultationFulfillment';
import { syncProviderServiceQueueOnFinalize } from '@/server/provider/syncProviderServiceQueueOnFinalize';

/** PostgREST `.or()` filter: assigned to this org, or patient-choice and not yet assigned. */
export function orgServiceQueueVisibilityFilter(orgId: string): string {
	return `and(assignment_mode.eq.${FULFILLMENT_MODE_ASSIGNED},fulfillment_org_id.eq.${orgId}),and(assignment_mode.eq.${FULFILLMENT_MODE_PATIENT_CHOICE},fulfillment_org_id.is.null)`;
}

export type ServiceQueueRoutedTo = 'pharmacist' | 'laboratory';

export async function countOrgServiceQueueItems(
	sb: SupabaseClient,
	opts: {
		orgId: string;
		routedTo: ServiceQueueRoutedTo;
		statuses: string[];
	},
): Promise<number> {
	const { count, error } = await sb
		.from('provider_service_queue_items')
		.select('*', { count: 'exact', head: true })
		.eq('routed_to', opts.routedTo)
		.in('status', opts.statuses)
		.or(orgServiceQueueVisibilityFilter(opts.orgId));
	if (error) {
		if (/does not exist|schema cache/i.test(error.message)) return 0;
		throw error;
	}
	return count ?? 0;
}

export async function listOrgServiceQueueItems(
	sb: SupabaseClient,
	opts: {
		orgId: string;
		routedTo: ServiceQueueRoutedTo;
		statuses: string[];
		limit?: number;
	},
) {
	return sb
		.from('provider_service_queue_items')
		.select('*')
		.eq('routed_to', opts.routedTo)
		.in('status', opts.statuses)
		.or(orgServiceQueueVisibilityFilter(opts.orgId))
		.order('created_at', { ascending: false })
		.limit(opts.limit ?? 200);
}

export async function fetchOrgServiceQueueItem(
	sb: SupabaseClient,
	opts: { id: string; orgId: string; routedTo: ServiceQueueRoutedTo },
) {
	const { data, error } = await sb
		.from('provider_service_queue_items')
		.select('*')
		.eq('id', opts.id)
		.eq('routed_to', opts.routedTo)
		.or(orgServiceQueueVisibilityFilter(opts.orgId))
		.maybeSingle();
	if (error) throw error;
	return data;
}

/** Assign patient-choice queue rows to this lab/pharmacy when staff begin fulfillment. */
export async function claimServiceQueueItemForOrg(
	sb: SupabaseClient,
	queueItem: { id: string; assignment_mode?: string | null; fulfillment_org_id?: string | null; payload?: unknown },
	orgId: string,
): Promise<void> {
	const mode = String(queueItem.assignment_mode || '');
	const fulfillmentOrgId = queueItem.fulfillment_org_id;

	if (mode === FULFILLMENT_MODE_ASSIGNED) {
		if (fulfillmentOrgId && fulfillmentOrgId !== orgId) {
			throw new Error('This order is assigned to another service provider.');
		}
		return;
	}

	if (mode !== FULFILLMENT_MODE_PATIENT_CHOICE || fulfillmentOrgId) {
		return;
	}

	const { data: org } = await sb
		.from('providers')
		.select('name, provider_name')
		.eq('id', orgId)
		.maybeSingle();
	const orgName =
		(org as { provider_name?: string; name?: string } | null)?.provider_name ||
		(org as { provider_name?: string; name?: string } | null)?.name ||
		null;

	const basePayload =
		queueItem.payload && typeof queueItem.payload === 'object' && !Array.isArray(queueItem.payload)
			? { ...(queueItem.payload as Record<string, unknown>) }
			: {};
	const fulfillmentSection: SectionFulfillment = {
		mode: FULFILLMENT_MODE_ASSIGNED,
		fulfillment_org_id: orgId,
		fulfillment_org_name: orgName,
	};
	const payload = mergeFulfillmentIntoPayload(basePayload, fulfillmentSection);

	const { error } = await sb
		.from('provider_service_queue_items')
		.update({
			assignment_mode: FULFILLMENT_MODE_ASSIGNED,
			fulfillment_org_id: orgId,
			payload,
			updated_at: new Date().toISOString(),
		})
		.eq('id', queueItem.id);
	if (error) throw error;
}

/**
 * Ensure queue rows exist for finalized encounters that still have pending consultation actions
 * (e.g. finalized before the service-queue migration, or sync did not run).
 */
export async function backfillServiceQueueFromPendingActions(
	sb: SupabaseClient,
	routedTo: ServiceQueueRoutedTo,
): Promise<void> {
	const itemType = routedTo === 'pharmacist' ? 'prescription' : 'lab';
	const { data: actions, error } = await sb
		.from('patient_consultation_action_items')
		.select('encounter_id')
		.eq('item_type', itemType)
		.eq('status', 'pending')
		.limit(500);
	if (error) {
		if (/does not exist|schema cache/i.test(error.message)) return;
		console.error('[backfillServiceQueueFromPendingActions] actions', error.message);
		return;
	}
	if (!actions?.length) return;

	const encounterIds = [...new Set(actions.map((a) => String((a as { encounter_id: string }).encounter_id)).filter(Boolean))];
	for (const encounterId of encounterIds) {
		const { data: enc, error: encErr } = await sb
			.from('provider_consultation_encounters')
			.select(
				'id, appointment_id, patient_user_id, provider_user_id, status, prescription_lines, lab_orders, prescription_fulfillment, lab_fulfillment',
			)
			.eq('id', encounterId)
			.maybeSingle();
		if (encErr || !enc || String(enc.status) !== 'finalized') continue;

		const { data: clinicalProfile } = await sb
			.from('profiles')
			.select('provider_org_id')
			.eq('id', enc.provider_user_id)
			.maybeSingle();
		const clinicalOrgId = (clinicalProfile as { provider_org_id?: string | null } | null)?.provider_org_id;
		if (!clinicalOrgId) continue;

		try {
			await syncProviderServiceQueueOnFinalize(sb, {
				id: enc.id,
				appointment_id: enc.appointment_id,
				patient_user_id: enc.patient_user_id,
				prescription_lines: enc.prescription_lines,
				lab_orders: enc.lab_orders,
				prescription_fulfillment: enc.prescription_fulfillment,
				lab_fulfillment: enc.lab_fulfillment,
				clinical_org_id: clinicalOrgId,
				clinical_provider_user_id: enc.provider_user_id,
			});
		} catch (e) {
			console.error('[backfillServiceQueueFromPendingActions] sync', encounterId, e);
		}
	}
}
