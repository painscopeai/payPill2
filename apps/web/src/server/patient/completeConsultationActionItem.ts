import type { SupabaseClient } from '@supabase/supabase-js';

function todayDateStr(): string {
	return new Date().toISOString().slice(0, 10);
}

function formatProviderName(p: { first_name?: string | null; last_name?: string | null; email?: string | null } | null): string {
	if (!p) return 'Your care team';
	const n = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
	return n || p.email || 'Your care team';
}

export type CompleteActionResult =
	| { ok: true; already: true; health_record_id: string | null }
	| { ok: true; health_record_id: string }
	| { ok: false; error: string; status: number };

/**
 * Patient marks a consultation action item complete: inserts patient_health_records and links the action row.
 */
export async function completeConsultationActionItem(
	sb: SupabaseClient,
	patientUserId: string,
	actionItemId: string,
): Promise<CompleteActionResult> {
	const { data: action, error: aErr } = await sb
		.from('patient_consultation_action_items')
		.select('id, encounter_id, appointment_id, patient_user_id, item_type, payload, status, health_record_id')
		.eq('id', actionItemId)
		.maybeSingle();

	if (aErr || !action) {
		return { ok: false, error: 'Action item not found', status: 404 };
	}

	if (String(action.patient_user_id) !== patientUserId) {
		return { ok: false, error: 'Forbidden', status: 403 };
	}

	if (action.status === 'completed' && action.health_record_id) {
		return { ok: true, already: true, health_record_id: String(action.health_record_id) };
	}
	if (action.status === 'completed') {
		return { ok: true, already: true, health_record_id: null };
	}

	const { data: encounter, error: encErr } = await sb
		.from('provider_consultation_encounters')
		.select('id, status, patient_user_id, provider_user_id, appointment_id')
		.eq('id', action.encounter_id)
		.maybeSingle();

	if (encErr || !encounter) {
		return { ok: false, error: 'Encounter not found', status: 404 };
	}
	if (String(encounter.patient_user_id) !== patientUserId || encounter.status !== 'finalized') {
		return { ok: false, error: 'Consultation is not available', status: 400 };
	}

	const { data: apt, error: aptErr } = await sb
		.from('appointments')
		.select('id, user_id, appointment_date, provider_id')
		.eq('id', action.appointment_id)
		.maybeSingle();

	if (aptErr || !apt) {
		return { ok: false, error: 'Appointment not found', status: 404 };
	}
	if (String(apt.user_id) !== patientUserId) {
		return { ok: false, error: 'Forbidden', status: 403 };
	}

	const { data: provProfile } = await sb
		.from('profiles')
		.select('first_name, last_name, email')
		.eq('id', encounter.provider_user_id)
		.maybeSingle();

	const providerLabel = formatProviderName(provProfile);

	const payload = (action.payload && typeof action.payload === 'object' ? action.payload : {}) as Record<string, unknown>;

	let recordInsert: {
		user_id: string;
		record_type: string;
		title: string;
		record_date: string;
		status: string | null;
		provider_or_facility: string;
		notes: string | null;
	};

	if (action.item_type === 'lab') {
		const title = String(payload.test_name || 'Lab test').trim() || 'Lab test';
		const code = String(payload.code || '').trim();
		const indication = String(payload.indication || '').trim();
		const priority = String(payload.priority || '').trim();
		const parts = [
			`Marked complete from your consultation action plan.`,
			code ? `Code: ${code}` : null,
			indication ? `Indication: ${indication}` : null,
			priority ? `Priority: ${priority}` : null,
		].filter(Boolean);
		recordInsert = {
			user_id: patientUserId,
			record_type: 'lab_result',
			title,
			record_date: todayDateStr(),
			status: 'Self-reported complete',
			provider_or_facility: providerLabel,
			notes: parts.join('\n'),
		};
	} else if (action.item_type === 'prescription') {
		const title = String(payload.medication_name || 'Medication').trim() || 'Medication';
		const strength = String(payload.strength || '').trim();
		const sig = String(payload.sig || '').trim();
		const freq = String(payload.frequency || '').trim();
		const route = String(payload.route || '').trim();
		const qty = String(payload.quantity || '').trim();
		const parts = [
			`Marked complete from your consultation action plan.`,
			strength ? `Strength: ${strength}` : null,
			sig ? `Directions: ${sig}` : null,
			[freq, route].filter(Boolean).length ? `Schedule: ${[freq, route].filter(Boolean).join(' · ')}` : null,
			qty ? `Quantity: ${qty}` : null,
		].filter(Boolean);
		recordInsert = {
			user_id: patientUserId,
			record_type: 'medication',
			title,
			record_date: todayDateStr(),
			status: 'Recorded after visit',
			provider_or_facility: providerLabel,
			notes: parts.join('\n'),
		};
	} else {
		return { ok: false, error: 'Invalid item type', status: 400 };
	}

	const { data: inserted, error: insErr } = await sb
		.from('patient_health_records')
		.insert(recordInsert)
		.select('id')
		.single();

	if (insErr || !inserted?.id) {
		console.error('[completeConsultationActionItem] insert health record', insErr?.message);
		return { ok: false, error: 'Could not create health record', status: 500 };
	}

	const hrId = String(inserted.id);
	const completedAt = new Date().toISOString();

	const { data: upd, error: upErr } = await sb
		.from('patient_consultation_action_items')
		.update({
			status: 'completed',
			completed_at: completedAt,
			health_record_id: hrId,
			updated_at: completedAt,
		})
		.eq('id', actionItemId)
		.eq('status', 'pending')
		.select('id')
		.maybeSingle();

	if (upErr) {
		console.error('[completeConsultationActionItem] update action', upErr.message);
		await sb.from('patient_health_records').delete().eq('id', hrId);
		return { ok: false, error: 'Could not update action item', status: 500 };
	}

	if (!upd?.id) {
		await sb.from('patient_health_records').delete().eq('id', hrId);
		const { data: again } = await sb
			.from('patient_consultation_action_items')
			.select('status, health_record_id')
			.eq('id', actionItemId)
			.maybeSingle();
		if (again?.status === 'completed') {
			return { ok: true, already: true, health_record_id: again.health_record_id ? String(again.health_record_id) : null };
		}
		return { ok: false, error: 'Action was modified; try again.', status: 409 };
	}

	return { ok: true, health_record_id: hrId };
}
