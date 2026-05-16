import type { SupabaseClient } from '@supabase/supabase-js';
import type { FulfillmentPartnerKind } from '@/server/provider/listFulfillmentPartners';
import { FULFILLMENT_MODE_PATIENT_CHOICE } from '@/lib/consultationFulfillment';

const KIND_TO_ROUTED: Record<FulfillmentPartnerKind, 'pharmacist' | 'laboratory'> = {
	pharmacy: 'pharmacist',
	laboratory: 'laboratory',
};

export type PendingFulfillmentItem = {
	id: string;
	item_type: string;
	payload: Record<string, unknown>;
	created_at: string;
	clinical_org_name: string | null;
	clinical_provider_name: string | null;
	summary: string;
};

export async function listPendingFulfillmentForPatient(
	sb: SupabaseClient,
	patientUserId: string,
	kind: FulfillmentPartnerKind,
): Promise<PendingFulfillmentItem[]> {
	const routedTo = KIND_TO_ROUTED[kind];

	const { data: rows, error } = await sb
		.from('provider_service_queue_items')
		.select(
			'id, item_type, payload, created_at, clinical_org_id, clinical_provider_user_id, encounter_id',
		)
		.eq('patient_user_id', patientUserId)
		.eq('assignment_mode', FULFILLMENT_MODE_PATIENT_CHOICE)
		.is('fulfillment_org_id', null)
		.eq('routed_to', routedTo)
		.in('status', ['pending', 'in_progress'])
		.order('created_at', { ascending: false })
		.limit(50);

	if (error) {
		if (/does not exist|schema cache/i.test(error.message)) return [];
		throw error;
	}

	const list = rows || [];
	const orgIds = [...new Set(list.map((r: { clinical_org_id?: string }) => r.clinical_org_id).filter(Boolean))];
	const provUserIds = [
		...new Set(list.map((r: { clinical_provider_user_id?: string }) => r.clinical_provider_user_id).filter(Boolean)),
	];

	const orgById = new Map<string, string>();
	if (orgIds.length) {
		const { data: orgs } = await sb.from('providers').select('id, name, provider_name').in('id', orgIds);
		for (const o of orgs || []) {
			const row = o as { id: string; name?: string; provider_name?: string };
			orgById.set(row.id, row.provider_name || row.name || 'Clinic');
		}
	}

	const profById = new Map<string, string>();
	if (provUserIds.length) {
		const { data: profs } = await sb
			.from('profiles')
			.select('id, first_name, last_name, email')
			.in('id', provUserIds as string[]);
		for (const p of profs || []) {
			const row = p as { id: string; first_name?: string; last_name?: string; email?: string };
			const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
			profById.set(row.id, name || row.email || 'Provider');
		}
	}

	return list.map((raw) => {
		const r = raw as {
			id: string;
			item_type: string;
			payload: Record<string, unknown> | null;
			created_at: string;
			clinical_org_id?: string;
			clinical_provider_user_id?: string;
		};
		const payload = (r.payload && typeof r.payload === 'object' ? r.payload : {}) as Record<string, unknown>;
		const summary =
			r.item_type === 'lab'
				? String(payload.test_name || 'Lab order').trim() || 'Lab order'
				: String(payload.medication_name || 'Medication').trim() || 'Medication';
		return {
			id: r.id,
			item_type: r.item_type,
			payload,
			created_at: r.created_at,
			clinical_org_name: r.clinical_org_id ? orgById.get(r.clinical_org_id) || null : null,
			clinical_provider_name: r.clinical_provider_user_id
				? profById.get(r.clinical_provider_user_id) || null
				: null,
			summary,
		};
	});
}
