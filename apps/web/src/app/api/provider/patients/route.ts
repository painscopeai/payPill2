import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { buildPatientCoverageSummary } from '@/server/patient/buildPatientCoverageSummary';
import { fetchAppointmentsForPracticeOrg } from '@/server/provider/fetchAppointmentsForPracticeOrg';
import {
	compareProviderPatientsByRecency,
	computeLastActivityAt,
	buildUserTimestampMap,
} from '@/server/provider/computeProviderPatientLastActivity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LinkedVia =
	| 'relationship'
	| 'appointment'
	| 'clinical_note'
	| 'telemedicine'
	| 'prescription'
	| 'consultation_encounter';

type AptRow = {
	id?: string;
	user_id: string | null;
	status: string | null;
	appointment_date: string | null;
	appointment_time: string | null;
	created_at?: string | null;
	updated_at?: string | null;
};

function utcDateString(): string {
	return new Date().toISOString().slice(0, 10);
}

function appointmentOpen(status: string | null | undefined): boolean {
	const x = String(status || 'scheduled')
		.trim()
		.toLowerCase();
	if (['cancelled', 'canceled', 'completed', 'no_show', 'no-show'].includes(x)) return false;
	return true;
}

function formatShortDate(isoDate: string): string {
	if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return isoDate;
	const d = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
	if (Number.isNaN(d.getTime())) return isoDate.slice(0, 10);
	return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function computeActivity(args: {
	patientId: string;
	aptsForPatient: AptRow[];
	draftEncounterPatientIds: Set<string>;
	today: string;
	linkedVia: LinkedVia[];
}): { patient_activity_status: string; patient_activity_kind: string } {
	const { patientId, aptsForPatient, draftEncounterPatientIds, today, linkedVia } = args;
	if (draftEncounterPatientIds.has(patientId)) {
		return { patient_activity_status: 'Consultation note in progress', patient_activity_kind: 'documenting' };
	}
	const mine = aptsForPatient.filter((a) => appointmentOpen(a.status));
	const sorted = [...mine].sort((a, b) => {
		const da = String(a.appointment_date || '');
		const db = String(b.appointment_date || '');
		if (da !== db) return da.localeCompare(db);
		return String(a.appointment_time || '00:00:00').localeCompare(String(b.appointment_time || '00:00:00'));
	});

	const next = sorted.find((a) => String(a.appointment_date || '') >= today);
	if (next?.appointment_date) {
		if (String(next.appointment_date) === today) {
			return { patient_activity_status: 'Appointment today', patient_activity_kind: 'today' };
		}
		return {
			patient_activity_status: `Upcoming visit · ${formatShortDate(next.appointment_date)}`,
			patient_activity_kind: 'upcoming',
		};
	}

	const past = [...sorted]
		.filter((a) => String(a.appointment_date || '') < today)
		.sort((a, b) => String(b.appointment_date || '').localeCompare(String(a.appointment_date || '')));
	if (past[0]?.appointment_date) {
		return {
			patient_activity_status: `Last visit · ${formatShortDate(past[0].appointment_date)}`,
			patient_activity_kind: 'past_visit',
		};
	}

	if (linkedVia.includes('appointment')) {
		return { patient_activity_status: 'Visits on file', patient_activity_kind: 'appointments_history' };
	}
	if (linkedVia.includes('clinical_note')) {
		return { patient_activity_status: 'Clinical notes on file', patient_activity_kind: 'clinical_notes' };
	}
	if (linkedVia.includes('prescription')) {
		return { patient_activity_status: 'Prescriptions on file', patient_activity_kind: 'prescriptions' };
	}
	if (linkedVia.includes('telemedicine')) {
		return { patient_activity_status: 'Telemedicine on file', patient_activity_kind: 'telemedicine' };
	}
	if (linkedVia.includes('consultation_encounter')) {
		return { patient_activity_status: 'Consultation documented', patient_activity_kind: 'encounter_done' };
	}
	if (linkedVia.includes('relationship')) {
		return { patient_activity_status: 'On your care team', patient_activity_kind: 'care_team' };
	}
	return { patient_activity_status: 'Connected', patient_activity_kind: 'linked' };
}

function computeVisitSummary(
	aptsForPatient: AptRow[],
	today: string,
): { next_visit_date: string | null; last_visit_date: string | null; appointments_count: number } {
	const count = aptsForPatient.length;
	if (!count) {
		return { next_visit_date: null, last_visit_date: null, appointments_count: 0 };
	}
	const sorted = [...aptsForPatient].sort((a, b) => {
		const da = String(a.appointment_date || '');
		const db = String(b.appointment_date || '');
		if (da !== db) return da.localeCompare(db);
		return String(a.appointment_time || '00:00:00').localeCompare(String(b.appointment_time || '00:00:00'));
	});
	const open = sorted.filter((a) => appointmentOpen(a.status));
	const next = open.find((a) => String(a.appointment_date || '') >= today);
	const past = open
		.filter((a) => String(a.appointment_date || '') < today)
		.sort((a, b) => String(b.appointment_date || '').localeCompare(String(a.appointment_date || '')));
	const allPast = [...sorted]
		.filter((a) => String(a.appointment_date || '') < today)
		.sort((a, b) => String(b.appointment_date || '').localeCompare(String(a.appointment_date || '')));
	const last = past[0]?.appointment_date || allPast[0]?.appointment_date || null;
	return {
		next_visit_date: next?.appointment_date || null,
		last_visit_date: last,
		appointments_count: count,
	};
}

async function collectUserIdsFromColumn(
	sb: ReturnType<typeof getSupabaseAdmin>,
	table: string,
	column: string,
	filter: { col: string; val: string },
): Promise<Set<string>> {
	const out = new Set<string>();
	const { data, error } = await sb.from(table).select(column).eq(filter.col, filter.val);
	if (error) {
		if (!/does not exist|schema cache/i.test(error.message)) {
			console.warn(`[api/provider/patients] ${table}`, error.message);
		}
		return out;
	}
	for (const row of data || []) {
		const v = (row as Record<string, string | null>)[column];
		if (v) out.add(v);
	}
	return out;
}

/** GET /api/provider/patients — roster ∪ anyone who booked, received prescriptions, notes, telemedicine, or consultation encounters with this practice/provider. */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;

	const sb = getSupabaseAdmin();
	const providerId = ctx.userId;
	const providerOrgId = ctx.providerOrgId;

	const { data: relationships, error } = await sb
		.from('patient_provider_relationships')
		.select('*')
		.eq('provider_id', providerId);

	if (error) {
		console.error('[api/provider/patients]', error.message);
		return NextResponse.json({ error: 'Failed to load patients' }, { status: 500 });
	}

	const relList = relationships || [];
	const relByPatient = new Map<string, (typeof relList)[number]>();
	for (const r of relList) {
		const row = r as { patient_id?: string };
		if (row.patient_id) relByPatient.set(row.patient_id, r as (typeof relList)[number]);
	}

	const appointmentPatientIds = new Set<string>();
	let orgAppointments: AptRow[] = [];
	if (providerOrgId) {
		const { rows: merged, error: aptErr } = await fetchAppointmentsForPracticeOrg(
			sb,
			providerOrgId,
			'id, user_id, status, appointment_date, appointment_time, created_at, updated_at',
			{ limitDirect: 1500, limitService: 1500 },
		);
		if (aptErr) {
			console.error('[api/provider/patients] appointments', aptErr);
		} else {
			orgAppointments = (merged || [])
				.map((r) => r as AptRow)
				.filter((r) => r.user_id);
			for (const row of orgAppointments) {
				if (row.user_id) appointmentPatientIds.add(row.user_id);
			}
		}
	}

	const clinicalNotePatientIds = await collectUserIdsFromColumn(sb, 'clinical_notes', 'user_id', {
		col: 'provider_id',
		val: providerId,
	});
	const telemedicinePatientIds = await collectUserIdsFromColumn(sb, 'telemedicine_sessions', 'user_id', {
		col: 'provider_id',
		val: providerId,
	});

	const prescriptionPatientIds = new Set<string>();
	if (providerOrgId) {
		const ids = await collectUserIdsFromColumn(sb, 'prescriptions', 'user_id', {
			col: 'provider_id',
			val: providerOrgId,
		});
		for (const id of ids) prescriptionPatientIds.add(id);
	}

	const encounterPatientIds = new Set<string>();
	const draftEncounterPatientIds = new Set<string>();
	const lastEncounterAt = new Map<string, number>();
	{
		const { data: encRows, error: encErr } = await sb
			.from('provider_consultation_encounters')
			.select('patient_user_id, status, updated_at, created_at')
			.eq('provider_user_id', providerId);
		if (encErr) {
			if (!/does not exist|schema cache/i.test(encErr.message)) {
				console.warn('[api/provider/patients] encounters', encErr.message);
			}
		} else {
			for (const row of encRows || []) {
				const r = row as {
					patient_user_id?: string;
					status?: string;
					updated_at?: string;
					created_at?: string;
				};
				if (r.patient_user_id) {
					encounterPatientIds.add(r.patient_user_id);
					if (String(r.status || '').toLowerCase() === 'draft') {
						draftEncounterPatientIds.add(r.patient_user_id);
					}
					const t = Math.max(
						Date.parse(r.updated_at || '') || 0,
						Date.parse(r.created_at || '') || 0,
					);
					if (t > (lastEncounterAt.get(r.patient_user_id) || 0)) {
						lastEncounterAt.set(r.patient_user_id, t);
					}
				}
			}
		}
	}

	const { data: noteRows } = await sb
		.from('clinical_notes')
		.select('user_id, date_created')
		.eq('provider_id', providerId)
		.limit(3000);
	const lastClinicalNoteAt = buildUserTimestampMap(
		(noteRows || []) as Record<string, unknown>[],
		['date_created'],
	);

	const { data: teleRows } = await sb
		.from('telemedicine_sessions')
		.select('user_id, started_at, created_at')
		.eq('provider_id', providerId)
		.limit(3000);
	const lastTelemedicineAt = buildUserTimestampMap(
		(teleRows || []) as Record<string, unknown>[],
		['started_at', 'created_at'],
	);

	const lastPrescriptionAt = new Map<string, number>();
	if (providerOrgId) {
		const { data: rxRows } = await sb
			.from('prescriptions')
			.select('user_id, created_at, date_prescribed')
			.eq('provider_id', providerOrgId)
			.limit(3000);
		const rxMap = buildUserTimestampMap((rxRows || []) as Record<string, unknown>[], [
			'created_at',
			'date_prescribed',
		]);
		for (const [uid, t] of rxMap) lastPrescriptionAt.set(uid, t);
	}

	const recencyContext = {
		lastEncounterAt,
		lastClinicalNoteAt,
		lastPrescriptionAt,
		lastTelemedicineAt,
	};

	const allIds = [
		...new Set([
			...relByPatient.keys(),
			...appointmentPatientIds,
			...clinicalNotePatientIds,
			...telemedicinePatientIds,
			...prescriptionPatientIds,
			...encounterPatientIds,
		]),
	];

	if (!allIds.length) {
		return NextResponse.json([]);
	}

	const { data: profRows, error: profErr } = await sb.from('profiles').select('*').in('id', allIds);
	if (profErr) {
		console.error('[api/provider/patients] profiles batch', profErr.message);
		return NextResponse.json({ error: 'Failed to load patient profiles' }, { status: 500 });
	}
	const profileById = new Map((profRows || []).map((p: { id: string }) => [p.id, p]));

	const { data: stepRows, error: stepErr } = await sb
		.from('patient_onboarding_steps')
		.select('user_id, step, data')
		.in('user_id', allIds)
		.limit(2000);
	if (stepErr) {
		console.warn('[api/provider/patients] onboarding steps', stepErr.message);
	}
	const stepsByUser = new Map<string, { step: number; data: unknown }[]>();
	for (const s of stepRows || []) {
		const row = s as { user_id: string; step: number; data: unknown };
		if (!row.user_id) continue;
		const arr = stepsByUser.get(row.user_id) || [];
		arr.push({ step: row.step, data: row.data });
		stepsByUser.set(row.user_id, arr);
	}

	const today = utcDateString();
	const aptsByUser = new Map<string, AptRow[]>();
	for (const a of orgAppointments) {
		if (!a.user_id) continue;
		const arr = aptsByUser.get(a.user_id) || [];
		arr.push(a);
		aptsByUser.set(a.user_id, arr);
	}

	const patientsWithDetails = await Promise.all(
		allIds.map(async (patient_id) => {
			const relationship = relByPatient.get(patient_id);
			const user = profileById.get(patient_id) ?? null;
			try {
				const steps = stepsByUser.get(patient_id) || [];
				const health_summary = Object.fromEntries(
					steps.map((s: { step: number; data: unknown }) => [`step_${s.step}`, s.data]),
				);

				const coverage_summary = await buildPatientCoverageSummary(sb, patient_id);

				const linked_via: LinkedVia[] = [];
				if (relationship) linked_via.push('relationship');
				if (appointmentPatientIds.has(patient_id)) linked_via.push('appointment');
				if (clinicalNotePatientIds.has(patient_id)) linked_via.push('clinical_note');
				if (telemedicinePatientIds.has(patient_id)) linked_via.push('telemedicine');
				if (prescriptionPatientIds.has(patient_id)) linked_via.push('prescription');
				if (encounterPatientIds.has(patient_id)) linked_via.push('consultation_encounter');

				const aptsForPatient = aptsByUser.get(patient_id) || [];
				const activity = computeActivity({
					patientId: patient_id,
					aptsForPatient,
					draftEncounterPatientIds,
					today,
					linkedVia: linked_via,
				});
				const visits = computeVisitSummary(aptsForPatient, today);
				const prof = user as {
					email?: string | null;
					phone?: string | null;
					date_of_birth?: string | null;
					gender?: string | null;
					updated_at?: string | null;
					created_at?: string | null;
				} | null;
				const relCreated =
					(relationship as { created_at?: string | null } | undefined)?.created_at ?? null;
				const last_activity_at = computeLastActivityAt(
					patient_id,
					{
						patient_id,
						patient_activity_kind: activity.patient_activity_kind,
						next_visit_date: visits.next_visit_date,
						last_visit_date: visits.last_visit_date,
						created_at: relCreated,
						patient_details: prof,
					},
					{ aptsForPatient, ...recencyContext },
				);

				return {
					...(relationship || {
						id: patient_id,
						patient_id,
						provider_id: providerId,
						created_at: null,
					}),
					id: (relationship as { id?: string } | undefined)?.id || patient_id,
					patient_id,
					patient_details: user,
					patient_email: prof?.email || null,
					patient_phone: prof?.phone || null,
					patient_date_of_birth: prof?.date_of_birth || null,
					patient_gender: prof?.gender || null,
					health_summary,
					coverage_summary,
					linked_via,
					patient_activity_status: activity.patient_activity_status,
					patient_activity_kind: activity.patient_activity_kind,
					next_visit_date: visits.next_visit_date,
					last_visit_date: visits.last_visit_date,
					appointments_count: visits.appointments_count,
					last_activity_at,
				};
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : String(e);
				console.warn(`[api/provider/patients] patient ${patient_id}: ${msg}`);
				const linked_via: LinkedVia[] = [];
				if (relationship) linked_via.push('relationship');
				if (appointmentPatientIds.has(patient_id)) linked_via.push('appointment');
				if (clinicalNotePatientIds.has(patient_id)) linked_via.push('clinical_note');
				if (telemedicinePatientIds.has(patient_id)) linked_via.push('telemedicine');
				if (prescriptionPatientIds.has(patient_id)) linked_via.push('prescription');
				if (encounterPatientIds.has(patient_id)) linked_via.push('consultation_encounter');
				const aptsForPatient = aptsByUser.get(patient_id) || [];
				const activity = computeActivity({
					patientId: patient_id,
					aptsForPatient,
					draftEncounterPatientIds,
					today,
					linkedVia: linked_via,
				});
				const visits = computeVisitSummary(aptsForPatient, today);
				const prof = user as {
					email?: string | null;
					phone?: string | null;
					date_of_birth?: string | null;
					gender?: string | null;
					updated_at?: string | null;
					created_at?: string | null;
				} | null;
				const relCreated =
					(relationship as { created_at?: string | null } | undefined)?.created_at ?? null;
				const last_activity_at = computeLastActivityAt(
					patient_id,
					{
						patient_id,
						patient_activity_kind: activity.patient_activity_kind,
						next_visit_date: visits.next_visit_date,
						last_visit_date: visits.last_visit_date,
						created_at: relCreated,
						patient_details: prof,
					},
					{ aptsForPatient, ...recencyContext },
				);
				return {
					...(relationship || {}),
					id: (relationship as { id?: string } | undefined)?.id || patient_id,
					patient_id,
					provider_id: providerId,
					patient_details: user,
					patient_email: prof?.email || null,
					patient_phone: prof?.phone || null,
					patient_date_of_birth: prof?.date_of_birth || null,
					patient_gender: prof?.gender || null,
					linked_via,
					patient_activity_status: activity.patient_activity_status,
					patient_activity_kind: activity.patient_activity_kind,
					next_visit_date: visits.next_visit_date,
					last_visit_date: visits.last_visit_date,
					appointments_count: visits.appointments_count,
					last_activity_at,
				};
			}
		}),
	);

	patientsWithDetails.sort((a, b) =>
		compareProviderPatientsByRecency(
			a as Parameters<typeof compareProviderPatientsByRecency>[0],
			b as Parameters<typeof compareProviderPatientsByRecency>[1],
		),
	);

	return NextResponse.json(patientsWithDetails);
}
