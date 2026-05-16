import type { SupabaseClient } from '@supabase/supabase-js';
import { FULFILLMENT_MODE_PATIENT_CHOICE } from '@/lib/consultationFulfillment';
import type { FulfillmentPartnerKind } from '@/server/provider/listFulfillmentPartners';

const KIND_TO_ITEM_TYPE: Record<FulfillmentPartnerKind, 'prescription' | 'lab'> = {
	pharmacy: 'prescription',
	laboratory: 'lab',
};

export type PendingBookingAction = {
	/** patient_consultation_action_items.id */
	action_item_id: string;
	/** provider_service_queue_items.id when present */
	queue_item_id: string | null;
	item_type: 'prescription' | 'lab';
	summary: string;
	subtitle: string | null;
	/** Consultation visit context (visit type · provider) */
	plan_label: string;
	/** ISO datetime for display — consultation appointment date/time */
	ordered_at: string;
	encounter_id: string;
	/** True when patient must pick a pharmacy/lab on booking to route the order */
	needs_fulfillment_assign: boolean;
};

function actionSummary(itemType: string, payload: Record<string, unknown>): string {
	if (itemType === 'lab') {
		const test = String(payload.test_name || 'Lab test').trim() || 'Lab test';
		const code = String(payload.code || '').trim();
		return code ? `${test} (${code})` : test;
	}
	const name = String(payload.medication_name || 'Medication').trim() || 'Medication';
	const strength = String(payload.strength || '').trim();
	return strength ? `${name} (${strength})` : name;
}

function actionSubtitle(itemType: string, payload: Record<string, unknown>): string | null {
	if (itemType === 'prescription') {
		const parts: string[] = [];
		if (payload.sig && String(payload.sig).trim()) parts.push(String(payload.sig).trim());
		const bits = [payload.dose, payload.frequency, payload.route].filter((x) => x != null && String(x).trim());
		if (bits.length) parts.push(bits.map(String).join(' · '));
		if (payload.quantity != null && String(payload.quantity).trim()) parts.push(`Qty ${payload.quantity}`);
		return parts.length ? parts.join(' · ') : null;
	}
	const parts: string[] = [];
	if (payload.indication && String(payload.indication).trim()) parts.push(String(payload.indication).trim());
	if (payload.priority && String(payload.priority).trim()) parts.push(String(payload.priority).trim());
	return parts.length ? parts.join(' · ') : null;
}

function formatProviderName(p: { first_name?: string | null; last_name?: string | null; email?: string | null } | null): string {
	if (!p) return 'Provider';
	const n = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
	return n || p.email || 'Provider';
}

function appointmentDateTimeIso(
	date: string | null | undefined,
	time: string | null | undefined,
): string | null {
	if (!date) return null;
	const raw = String(time || '').trim();
	let timePart = '12:00:00';
	if (raw) {
		const parts = raw.split(':');
		const h = parts[0]?.padStart(2, '0') ?? '12';
		const m = (parts[1] ?? '00').padStart(2, '0');
		const s = (parts[2] ?? '00').padStart(2, '0');
		timePart = `${h}:${m}:${s}`;
	}
	return `${date}T${timePart}`;
}

function visitLabelFromAppointment(apt: Record<string, unknown>): string {
	const vt = apt.visit_types as { label?: string } | { label?: string }[] | null | undefined;
	if (vt && !Array.isArray(vt) && vt.label) return vt.label;
	if (Array.isArray(vt) && vt[0]?.label) return vt[0].label;
	return String(apt.appointment_type || apt.type || 'Consultation');
}

/** Pending consultation action items for pharmacy or laboratory booking. */
export async function listPendingBookingActions(
	sb: SupabaseClient,
	patientUserId: string,
	kind: FulfillmentPartnerKind,
): Promise<PendingBookingAction[]> {
	const itemType = KIND_TO_ITEM_TYPE[kind];

	const { data: actionRows, error: actErr } = await sb
		.from('patient_consultation_action_items')
		.select('id, item_type, payload, created_at, encounter_id, source_line_id, appointment_id')
		.eq('patient_user_id', patientUserId)
		.eq('status', 'pending')
		.eq('item_type', itemType)
		.order('created_at', { ascending: false })
		.limit(50);

	if (actErr) {
		if (/does not exist|schema cache/i.test(actErr.message)) return [];
		throw actErr;
	}

	const actions = actionRows || [];
	if (!actions.length) return [];

	const encounterIds = [...new Set(actions.map((a: { encounter_id: string }) => a.encounter_id))];
	const appointmentIds = [...new Set(actions.map((a: { appointment_id: string }) => a.appointment_id))];

	const [encRes, aptRes, queueRes] = await Promise.all([
		sb
			.from('provider_consultation_encounters')
			.select('id, updated_at, provider_user_id, appointment_id')
			.in('id', encounterIds),
		appointmentIds.length
			? sb
					.from('appointments')
					.select(
						`
            id,
            appointment_date,
            appointment_time,
            appointment_type,
            type,
            visit_types ( slug, label )
          `,
					)
					.in('id', appointmentIds)
			: Promise.resolve({ data: [], error: null }),
		sb
			.from('provider_service_queue_items')
			.select('id, encounter_id, source_line_id, assignment_mode, fulfillment_org_id, status, routed_to')
			.in('encounter_id', encounterIds)
			.in('status', ['pending', 'in_progress']),
	]);

	if (encRes.error && !/does not exist|schema cache/i.test(encRes.error.message)) throw encRes.error;
	if (aptRes.error) throw aptRes.error;

	const encById = new Map(
		(encRes.data || []).map((e: { id: string }) => [e.id, e as { id: string; updated_at: string; provider_user_id: string; appointment_id: string }]),
	);
	const aptById = new Map((aptRes.data || []).map((a: { id: string }) => [a.id, a as Record<string, unknown>]));

	const provIds = [...new Set([...encById.values()].map((e) => e.provider_user_id).filter(Boolean))];
	const profById = new Map<string, string>();
	if (provIds.length) {
		const { data: profs } = await sb
			.from('profiles')
			.select('id, first_name, last_name, email')
			.in('id', provIds);
		for (const p of profs || []) {
			const row = p as { id: string; first_name?: string; last_name?: string; email?: string };
			profById.set(row.id, formatProviderName(row));
		}
	}

	const queueByLine = new Map<string, { id: string; needs_assign: boolean }>();
	if (!queueRes.error && queueRes.data) {
		for (const q of queueRes.data) {
			const row = q as {
				id: string;
				encounter_id: string;
				source_line_id: string;
				assignment_mode?: string;
				fulfillment_org_id?: string | null;
			};
			const needs_assign =
				row.assignment_mode === FULFILLMENT_MODE_PATIENT_CHOICE && !row.fulfillment_org_id;
			queueByLine.set(`${row.encounter_id}:${row.source_line_id}`, { id: row.id, needs_assign });
		}
	}

	return actions.map((raw) => {
		const a = raw as {
			id: string;
			item_type: string;
			payload: Record<string, unknown> | null;
			created_at: string;
			encounter_id: string;
			source_line_id: string;
			appointment_id: string;
		};
		const payload = (a.payload && typeof a.payload === 'object' ? a.payload : {}) as Record<string, unknown>;
		const enc = encById.get(a.encounter_id);
		const apt = aptById.get(a.appointment_id);
		const providerName = enc ? profById.get(enc.provider_user_id) || 'Provider' : 'Provider';
		const visitLabel = apt ? visitLabelFromAppointment(apt) : 'Consultation';
		const planParts = [visitLabel, providerName].filter(Boolean);
		const queue = queueByLine.get(`${a.encounter_id}:${a.source_line_id}`);
		const orderedAt =
			(apt && appointmentDateTimeIso(apt.appointment_date as string, apt.appointment_time as string)) ||
			enc?.updated_at ||
			a.created_at;

		return {
			action_item_id: a.id,
			queue_item_id: queue?.id ?? null,
			item_type: itemType,
			summary: actionSummary(a.item_type, payload),
			subtitle: actionSubtitle(a.item_type, payload),
			plan_label: planParts.join(' · '),
			ordered_at: orderedAt,
			encounter_id: a.encounter_id,
			needs_fulfillment_assign: queue?.needs_assign ?? false,
		};
	});
}
