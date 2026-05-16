import type { SupabaseClient } from '@supabase/supabase-js';

export type ServiceQueueRow = {
	id: string;
	encounter_id: string;
	appointment_id: string;
	patient_user_id: string;
	item_type: string;
	routed_to: string;
	assignment_mode?: string;
	fulfillment_org_id?: string | null;
	source_line_id: string;
	line_index: number;
	payload: Record<string, unknown>;
	status: string;
	fulfilled_at: string | null;
	fulfillment_notes: string | null;
	drug_catalog_id: string | null;
	quantity_dispensed: number | null;
	lab_result_summary: string | null;
	created_at: string;
};

export async function enrichQueueItemsWithPatients(
	sb: SupabaseClient,
	items: ServiceQueueRow[],
) {
	const userIds = [...new Set(items.map((i) => i.patient_user_id).filter(Boolean))];
	if (!userIds.length) return items.map((i) => ({ ...i, patient: null }));

	const { data: profs } = await sb
		.from('profiles')
		.select('id, first_name, last_name, email, phone, date_of_birth')
		.in('id', userIds);
	const byId = new Map((profs || []).map((p: { id: string }) => [p.id, p]));

	return items.map((item) => ({
		...item,
		payload: (item.payload && typeof item.payload === 'object' ? item.payload : {}) as Record<string, unknown>,
		patient: byId.get(item.patient_user_id) || null,
	}));
}

export function patientDisplayName(p: {
	first_name?: string | null;
	last_name?: string | null;
	email?: string | null;
} | null): string {
	if (!p) return 'Patient';
	const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
	return name || p.email || 'Patient';
}
