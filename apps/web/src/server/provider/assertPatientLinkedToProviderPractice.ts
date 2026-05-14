import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAppointmentsForPracticeOrg } from '@/server/provider/fetchAppointmentsForPracticeOrg';

/**
 * True when the patient is on the same roster / touchpoints as GET /api/provider/patients
 * (relationships, org appointments, encounters, notes, telemedicine, prescriptions).
 */
export async function assertPatientLinkedToProviderPractice(
	sb: SupabaseClient,
	args: { providerUserId: string; providerOrgId: string | null; patientUserId: string },
): Promise<boolean> {
	const { providerUserId, providerOrgId, patientUserId } = args;

	const { data: rel } = await sb
		.from('patient_provider_relationships')
		.select('id')
		.eq('provider_id', providerUserId)
		.eq('patient_id', patientUserId)
		.maybeSingle();
	if (rel) return true;

	const { data: enc } = await sb
		.from('provider_consultation_encounters')
		.select('id')
		.eq('provider_user_id', providerUserId)
		.eq('patient_user_id', patientUserId)
		.limit(1)
		.maybeSingle();
	if (enc) return true;

	const { data: note } = await sb
		.from('clinical_notes')
		.select('id')
		.eq('provider_id', providerUserId)
		.eq('user_id', patientUserId)
		.limit(1)
		.maybeSingle();
	if (note) return true;

	const { data: tm } = await sb
		.from('telemedicine_sessions')
		.select('id')
		.eq('provider_id', providerUserId)
		.eq('user_id', patientUserId)
		.limit(1)
		.maybeSingle();
	if (tm) return true;

	if (providerOrgId) {
		const { data: rx } = await sb
			.from('prescriptions')
			.select('id')
			.eq('provider_id', providerOrgId)
			.eq('user_id', patientUserId)
			.limit(1)
			.maybeSingle();
		if (rx) return true;

		const { rows: orgApts, error: aptErr } = await fetchAppointmentsForPracticeOrg(
			sb,
			providerOrgId,
			'id, user_id',
			{ limitDirect: 2500, limitService: 2500 },
		);
		if (!aptErr) {
			for (const r of orgApts) {
				if (String((r as { user_id?: string }).user_id || '') === patientUserId) return true;
			}
		}
	}

	return false;
}
