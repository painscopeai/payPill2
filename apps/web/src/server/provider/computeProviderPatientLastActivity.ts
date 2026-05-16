import { appointmentTimestamp, maxTimestamp, toTimestamp } from '@/lib/sortByRecency';

type AptRow = {
	appointment_date?: string | null;
	appointment_time?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
};

export type ProviderPatientRecencyInput = {
	patient_id: string;
	patient_activity_kind?: string;
	next_visit_date?: string | null;
	last_visit_date?: string | null;
	created_at?: string | null;
	patient_details?: { updated_at?: string | null; created_at?: string | null } | null;
};

export function computeLastActivityAt(
	patientId: string,
	input: ProviderPatientRecencyInput,
	context: {
		aptsForPatient: AptRow[];
		lastEncounterAt: Map<string, number>;
		lastClinicalNoteAt: Map<string, number>;
		lastPrescriptionAt: Map<string, number>;
		lastTelemedicineAt: Map<string, number>;
	},
): number {
	const { aptsForPatient, lastEncounterAt, lastClinicalNoteAt, lastPrescriptionAt, lastTelemedicineAt } =
		context;

	let latest = 0;
	for (const apt of aptsForPatient) {
		latest = Math.max(
			latest,
			appointmentTimestamp(apt.appointment_date, apt.appointment_time),
			toTimestamp(apt.updated_at),
			toTimestamp(apt.created_at),
		);
	}

	latest = Math.max(
		latest,
		lastEncounterAt.get(patientId) || 0,
		lastClinicalNoteAt.get(patientId) || 0,
		lastPrescriptionAt.get(patientId) || 0,
		lastTelemedicineAt.get(patientId) || 0,
		toTimestamp(input.created_at),
		toTimestamp(input.patient_details?.updated_at),
		toTimestamp(input.patient_details?.created_at),
		toTimestamp(input.last_visit_date),
	);

	if (input.patient_activity_kind === 'today' && input.next_visit_date) {
		latest = Math.max(latest, appointmentTimestamp(input.next_visit_date, '23:59:59'));
	}

	return latest;
}

const ACTIVITY_KIND_RANK: Record<string, number> = {
	today: 0,
	documenting: 1,
	upcoming: 2,
};

export function compareProviderPatientsByRecency(
	a: ProviderPatientRecencyInput & { last_activity_at?: number; coverage_summary?: { full_name?: string } | null; patient_details?: { first_name?: string | null; last_name?: string | null; name?: string | null; email?: string | null } | null },
	b: ProviderPatientRecencyInput & { last_activity_at?: number; coverage_summary?: { full_name?: string } | null; patient_details?: { first_name?: string | null; last_name?: string | null; name?: string | null; email?: string | null } | null },
): number {
	const ra = ACTIVITY_KIND_RANK[a.patient_activity_kind || ''] ?? 50;
	const rb = ACTIVITY_KIND_RANK[b.patient_activity_kind || ''] ?? 50;
	if (ra !== rb) return ra - rb;

	const ta = a.last_activity_at || 0;
	const tb = b.last_activity_at || 0;
	if (tb !== ta) return tb - ta;

	const na = String(a.next_visit_date || '9999-99-99');
	const nb = String(b.next_visit_date || '9999-99-99');
	if (na !== nb) return na.localeCompare(nb);

	return String(a.patient_id).localeCompare(String(b.patient_id));
}

export function buildUserTimestampMap(
	rows: Record<string, unknown>[],
	dateFields: string[],
): Map<string, number> {
	const map = new Map<string, number>();
	for (const row of rows) {
		const uid = row.user_id;
		if (typeof uid !== 'string' || !uid) continue;
		const t = maxTimestamp(...dateFields.map((f) => row[f]));
		if (t > (map.get(uid) || 0)) map.set(uid, t);
	}
	return map;
}
