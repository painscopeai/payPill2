import type { SupabaseClient } from '@supabase/supabase-js';
import {
	coerceJsonArray,
	type EncounterForActionSync,
} from '@/server/patient/syncConsultationActionItemsOnFinalize';
import {
	mergeFulfillmentIntoPayload,
	parseSectionFulfillment,
	serializeSectionFulfillment,
	type SectionFulfillment,
} from '@/lib/consultationFulfillment';

function normalizeLines(raw: unknown): Record<string, unknown>[] {
	return coerceJsonArray(raw).filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
}

function stableLineId(itemType: 'prescription' | 'lab', idx: number, payload: Record<string, unknown>): string {
	const id = payload.id != null ? String(payload.id).trim() : '';
	if (id) return id;
	return `__generated_${itemType}_${idx}`;
}

function isNonEmptyPrescription(p: Record<string, unknown>): boolean {
	return Boolean(String(p.medication_name || '').trim());
}

function isNonEmptyLab(p: Record<string, unknown>): boolean {
	return Boolean(String(p.test_name || '').trim());
}

export type EncounterForServiceQueue = EncounterForActionSync & {
	clinical_org_id: string;
	clinical_provider_user_id: string;
	prescription_fulfillment?: unknown;
	lab_fulfillment?: unknown;
};

/**
 * When a clinical encounter is finalized, route Rx lines to pharmacy portal and lab lines to laboratory portal.
 */
export async function syncProviderServiceQueueOnFinalize(
	sb: SupabaseClient,
	encounter: EncounterForServiceQueue,
): Promise<{ rxCount: number; labCount: number }> {
	const rxFulfillment = serializeSectionFulfillment(parseSectionFulfillment(encounter.prescription_fulfillment));
	const labFulfillment = serializeSectionFulfillment(parseSectionFulfillment(encounter.lab_fulfillment));

	const rxLines = normalizeLines(encounter.prescription_lines).filter(isNonEmptyPrescription);
	const labLines = normalizeLines(encounter.lab_orders).filter(isNonEmptyLab);

	const { data: existing, error: exErr } = await sb
		.from('provider_service_queue_items')
		.select('id, item_type, source_line_id, status')
		.eq('encounter_id', encounter.id);
	if (exErr) {
		console.error('[syncProviderServiceQueueOnFinalize] select', exErr.message);
		return { rxCount: 0, labCount: 0 };
	}

	const desiredKeys = new Set<string>();

	let idx = 0;
	for (const line of rxLines) {
		const payload = mergeFulfillmentIntoPayload(line, rxFulfillment);
		const source_line_id = stableLineId('prescription', idx, payload);
		desiredKeys.add(`prescription:${source_line_id}`);
		await upsertQueueRow(sb, encounter, {
			item_type: 'prescription',
			routed_to: 'pharmacist',
			source_line_id,
			line_index: idx,
			payload,
			sectionFulfillment: rxFulfillment,
		});
		idx += 1;
	}

	idx = 0;
	for (const line of labLines) {
		const payload = mergeFulfillmentIntoPayload(line, labFulfillment);
		const source_line_id = stableLineId('lab', idx, payload);
		desiredKeys.add(`lab:${source_line_id}`);
		await upsertQueueRow(sb, encounter, {
			item_type: 'lab',
			routed_to: 'laboratory',
			source_line_id,
			line_index: idx,
			payload,
			sectionFulfillment: labFulfillment,
		});
		idx += 1;
	}

	for (const e of existing || []) {
		const key = `${e.item_type}:${e.source_line_id}`;
		if (e.status !== 'pending' && e.status !== 'in_progress') continue;
		if (!desiredKeys.has(key)) {
			await sb.from('provider_service_queue_items').delete().eq('id', e.id);
		}
	}

	return { rxCount: rxLines.length, labCount: labLines.length };
}

async function upsertQueueRow(
	sb: SupabaseClient,
	encounter: EncounterForServiceQueue,
	row: {
		item_type: 'prescription' | 'lab';
		routed_to: 'pharmacist' | 'laboratory';
		source_line_id: string;
		line_index: number;
		payload: Record<string, unknown>;
		sectionFulfillment: SectionFulfillment;
	},
) {
	const { data: existing } = await sb
		.from('provider_service_queue_items')
		.select('id, status')
		.eq('encounter_id', encounter.id)
		.eq('source_line_id', row.source_line_id)
		.maybeSingle();

	const serialized = serializeSectionFulfillment(row.sectionFulfillment);
	const base = {
		appointment_id: encounter.appointment_id,
		patient_user_id: encounter.patient_user_id,
		clinical_org_id: encounter.clinical_org_id,
		clinical_provider_user_id: encounter.clinical_provider_user_id,
		item_type: row.item_type,
		routed_to: row.routed_to,
		line_index: row.line_index,
		payload: row.payload,
		assignment_mode: serialized.mode,
		fulfillment_org_id: serialized.fulfillment_org_id,
		updated_at: new Date().toISOString(),
	};

	if (!existing) {
		await sb.from('provider_service_queue_items').insert({
			encounter_id: encounter.id,
			source_line_id: row.source_line_id,
			status: 'pending',
			...base,
		});
		return;
	}

	if (existing.status === 'pending' || existing.status === 'in_progress') {
		await sb.from('provider_service_queue_items').update(base).eq('id', existing.id);
	}
}
