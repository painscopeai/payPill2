import type { SupabaseClient } from '@supabase/supabase-js';

/** Sensitive chart sections (Records tab) — requires step-up password token. */
export async function loadProviderPatientRecordsBundle(sb: SupabaseClient, patientId: string) {
	const [
		{ data: onboarding_steps, error: obErr },
		{ data: health_records, error: hrErr },
		{ data: clinical_notes, error: cnErr },
		{ data: prescriptions, error: rxErr },
		{ data: lab_results, error: labErr },
	] = await Promise.all([
		sb.from('patient_onboarding_steps').select('step, data, updated_at').eq('user_id', patientId).order('step'),
		sb
			.from('patient_health_records')
			.select('id, record_type, title, record_date, status, provider_or_facility, notes, created_at, updated_at')
			.eq('user_id', patientId)
			.order('created_at', { ascending: false })
			.limit(200),
		sb
			.from('clinical_notes')
			.select('id, provider_id, appointment_id, note_content, date_created')
			.eq('user_id', patientId)
			.order('date_created', { ascending: false })
			.limit(100),
		sb
			.from('prescriptions')
			.select(
				'id, medication_name, dosage, frequency, quantity, refills_remaining, status, date_prescribed, created_at',
			)
			.eq('user_id', patientId)
			.order('date_prescribed', { ascending: false })
			.limit(100),
		sb
			.from('lab_results')
			.select('id, test_name, result_value, unit, test_date, created_at')
			.eq('user_id', patientId)
			.order('test_date', { ascending: false })
			.limit(80),
	]);

	if (obErr) console.error('[provider/patient records] onboarding', obErr.message);
	if (hrErr) console.error('[provider/patient records] health_records', hrErr.message);
	if (cnErr) console.error('[provider/patient records] clinical_notes', cnErr.message);
	if (rxErr) console.error('[provider/patient records] prescriptions', rxErr.message);
	if (labErr) console.error('[provider/patient records] lab_results', labErr.message);

	const authorIds = Array.from(
		new Set((clinical_notes || []).map((n: { provider_id?: string }) => n.provider_id).filter(Boolean)),
	) as string[];
	let authorById = new Map<string, string>();
	if (authorIds.length) {
		const { data: authors } = await sb
			.from('profiles')
			.select('id, first_name, last_name, email')
			.in('id', authorIds);
		authorById = new Map(
			(authors || []).map((a: { id: string; first_name?: string; last_name?: string; email?: string }) => {
				const name = [a.first_name, a.last_name].filter(Boolean).join(' ').trim();
				return [a.id, name || a.email || a.id.slice(0, 8)];
			}),
		);
	}

	const notesWithAuthors = (clinical_notes || []).map(
		(n: { id: string; provider_id: string; appointment_id?: string; note_content: string; date_created: string }) => ({
			...n,
			author_label: authorById.get(n.provider_id) || 'Provider',
		}),
	);

	return {
		onboarding_steps: onboarding_steps || [],
		health_records: health_records || [],
		clinical_notes: notesWithAuthors,
		prescriptions: prescriptions || [],
		lab_results: lab_results || [],
	};
}
