import type { SupabaseClient } from '@supabase/supabase-js';

export type EncounterForActionSync = {
	id: string;
	appointment_id: string;
	patient_user_id: string;
	prescription_lines: unknown;
	lab_orders: unknown;
};

function normalizeLines(raw: unknown): Record<string, unknown>[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
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

/**
 * Idempotent sync when an encounter is saved as finalized: upsert pending rows by stable source_line_id,
 * update payload for still-pending rows, delete pending rows removed from the encounter JSON.
 */
export async function syncConsultationActionItemsOnFinalize(
	sb: SupabaseClient,
	encounter: EncounterForActionSync,
): Promise<void> {
	const rxLines = normalizeLines(encounter.prescription_lines).filter(isNonEmptyPrescription);
	const labLines = normalizeLines(encounter.lab_orders).filter(isNonEmptyLab);

	const { data: existing, error: exErr } = await sb
		.from('patient_consultation_action_items')
		.select('id, item_type, source_line_id, status')
		.eq('encounter_id', encounter.id);
	if (exErr) {
		console.error('[syncConsultationActionItemsOnFinalize] select', exErr.message);
		return;
	}

	const desiredKeys = new Set<string>();

	let idx = 0;
	for (const payload of rxLines) {
		const source_line_id = stableLineId('prescription', idx, payload);
		desiredKeys.add(`prescription:${source_line_id}`);
		const { data: row } = await sb
			.from('patient_consultation_action_items')
			.select('id, status')
			.eq('encounter_id', encounter.id)
			.eq('item_type', 'prescription')
			.eq('source_line_id', source_line_id)
			.maybeSingle();

		if (!row) {
			await sb.from('patient_consultation_action_items').insert({
				encounter_id: encounter.id,
				appointment_id: encounter.appointment_id,
				patient_user_id: encounter.patient_user_id,
				item_type: 'prescription',
				source_line_id,
				line_index: idx,
				payload,
				status: 'pending',
			});
		} else if (row.status === 'pending') {
			await sb
				.from('patient_consultation_action_items')
				.update({ payload, line_index: idx, updated_at: new Date().toISOString() })
				.eq('id', row.id);
		}
		idx += 1;
	}

	idx = 0;
	for (const payload of labLines) {
		const source_line_id = stableLineId('lab', idx, payload);
		desiredKeys.add(`lab:${source_line_id}`);
		const { data: row } = await sb
			.from('patient_consultation_action_items')
			.select('id, status')
			.eq('encounter_id', encounter.id)
			.eq('item_type', 'lab')
			.eq('source_line_id', source_line_id)
			.maybeSingle();

		if (!row) {
			await sb.from('patient_consultation_action_items').insert({
				encounter_id: encounter.id,
				appointment_id: encounter.appointment_id,
				patient_user_id: encounter.patient_user_id,
				item_type: 'lab',
				source_line_id,
				line_index: idx,
				payload,
				status: 'pending',
			});
		} else if (row.status === 'pending') {
			await sb
				.from('patient_consultation_action_items')
				.update({ payload, line_index: idx, updated_at: new Date().toISOString() })
				.eq('id', row.id);
		}
		idx += 1;
	}

	for (const e of existing || []) {
		const key = `${e.item_type}:${e.source_line_id}`;
		if (e.status !== 'pending') continue;
		if (!desiredKeys.has(key)) {
			const { error: delErr } = await sb.from('patient_consultation_action_items').delete().eq('id', e.id);
			if (delErr) console.error('[syncConsultationActionItemsOnFinalize] delete', delErr.message);
		}
	}
}
