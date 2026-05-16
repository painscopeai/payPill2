import type { SupabaseClient } from '@supabase/supabase-js';

type QueueItemForCompletion = {
	id: string;
	patient_user_id: string;
	encounter_id: string;
	source_line_id: string;
	fulfillment_org_id?: string | null;
	payload?: unknown;
};

const COMPLETABLE_APPOINTMENT_STATUSES = new Set(['confirmed', 'scheduled', 'pending']);

function payloadBookingAppointmentId(payload: unknown): string | null {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
	const id = (payload as Record<string, unknown>).booking_appointment_id;
	return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/**
 * When pharmacy dispenses or lab completes a queue item, mark the patient's linked
 * booking appointment (and consultation action row) as completed.
 */
export async function completeLinkedFulfillmentAppointments(
	sb: SupabaseClient,
	queueItem: QueueItemForCompletion,
	fulfillmentOrgId: string,
): Promise<{ appointmentIds: string[]; actionItemUpdated: boolean }> {
	const now = new Date().toISOString();
	const appointmentIds = new Set<string>();

	const bookingId = payloadBookingAppointmentId(queueItem.payload);
	if (bookingId) appointmentIds.add(bookingId);

	// Fallback: most recent open booking at this fulfillment org for the same patient.
	if (!bookingId && queueItem.patient_user_id && fulfillmentOrgId) {
		const { data: recent } = await sb
			.from('appointments')
			.select('id, status')
			.eq('user_id', queueItem.patient_user_id)
			.eq('provider_id', fulfillmentOrgId)
			.in('status', ['confirmed', 'scheduled'])
			.order('appointment_date', { ascending: false })
			.order('appointment_time', { ascending: false })
			.limit(1);
		const row = recent?.[0] as { id: string } | undefined;
		if (row?.id) appointmentIds.add(row.id);
	}

	const completedAppointmentIds: string[] = [];
	for (const aptId of appointmentIds) {
		const { data: apt } = await sb
			.from('appointments')
			.select('id, status, user_id, provider_id')
			.eq('id', aptId)
			.maybeSingle();
		if (!apt) continue;
		const row = apt as { id: string; status: string; user_id: string; provider_id: string };
		if (row.user_id !== queueItem.patient_user_id) continue;
		if (row.provider_id !== fulfillmentOrgId) continue;
		if (!COMPLETABLE_APPOINTMENT_STATUSES.has(String(row.status || '').toLowerCase())) continue;

		const { error } = await sb
			.from('appointments')
			.update({ status: 'completed', updated_at: now })
			.eq('id', aptId);
		if (!error) completedAppointmentIds.push(aptId);
	}

	let actionItemUpdated = false;
	const { data: actionRow, error: actErr } = await sb
		.from('patient_consultation_action_items')
		.select('id, status')
		.eq('encounter_id', queueItem.encounter_id)
		.eq('source_line_id', queueItem.source_line_id)
		.eq('patient_user_id', queueItem.patient_user_id)
		.maybeSingle();

	if (!actErr && actionRow && actionRow.status === 'pending') {
		const { error: upAct } = await sb
			.from('patient_consultation_action_items')
			.update({
				status: 'completed',
				completed_at: now,
				updated_at: now,
			})
			.eq('id', actionRow.id);
		actionItemUpdated = !upAct;
	}

	return { appointmentIds: completedAppointmentIds, actionItemUpdated };
}
