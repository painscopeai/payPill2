import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { isConsultationQueueVisit, visitSlugFromAppointmentRow } from '@/server/provider/consultationVisitSlugs';
import {
	coerceJsonArray,
	syncConsultationActionItemsOnFinalize,
} from '@/server/patient/syncConsultationActionItemsOnFinalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatName(p: { first_name?: string | null; last_name?: string | null; email?: string | null } | null): string {
	if (!p) return 'Provider';
	const n = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
	return n || p.email || 'Provider';
}

function hasNonEmptyRxOrLab(prescription_lines: unknown, lab_orders: unknown): boolean {
	const rx = coerceJsonArray(prescription_lines).filter(
		(x) => x && typeof x === 'object' && String((x as Record<string, unknown>).medication_name || '').trim(),
	);
	const lab = coerceJsonArray(lab_orders).filter(
		(x) => x && typeof x === 'object' && String((x as Record<string, unknown>).test_name || '').trim(),
	);
	return rx.length > 0 || lab.length > 0;
}

/** GET /api/patient/consultations/[appointmentId] — finalized visit, full encounter summary, action plan (with lazy backfill). */
export async function GET(request: NextRequest, ctx: { params: Promise<{ appointmentId: string }> }) {
	void request;
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { appointmentId } = await ctx.params;
	const sb = getSupabaseAdmin();

	const { data: apt, error: aptErr } = await sb
		.from('appointments')
		.select(
			`
      id,
      user_id,
      appointment_date,
      appointment_time,
      reason,
      status,
      confirmation_number,
      visit_types ( slug, label )
    `,
		)
		.eq('id', appointmentId)
		.maybeSingle();

	if (aptErr || !apt) {
		return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
	}
	if (String((apt as { user_id: string }).user_id) !== uid) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const row = apt as Record<string, unknown>;
	const slug = visitSlugFromAppointmentRow(row as never);
	if (!isConsultationQueueVisit(slug)) {
		return NextResponse.json({ error: 'Not a consultation visit' }, { status: 400 });
	}

	const { data: encounter, error: encErr } = await sb
		.from('provider_consultation_encounters')
		.select(
			`
      id,
      status,
      updated_at,
      patient_user_id,
      provider_user_id,
      appointment_id,
      subjective,
      objective,
      assessment,
      plan,
      additional_notes,
      vitals,
      prescription_lines,
      lab_orders
    `,
		)
		.eq('appointment_id', appointmentId)
		.maybeSingle();

	if (encErr) {
		console.error('[api/patient/consultations/:id GET]', encErr.message);
		return NextResponse.json({ error: 'Failed to load encounter' }, { status: 500 });
	}
	if (!encounter || encounter.status !== 'finalized') {
		return NextResponse.json({ error: 'No finalized consultation for this visit yet.' }, { status: 404 });
	}

	const enc = encounter as {
		id: string;
		patient_user_id: string;
		provider_user_id: string;
		appointment_id: string;
		subjective: string | null;
		objective: string | null;
		assessment: string | null;
		plan: string | null;
		additional_notes: string | null;
		vitals: Record<string, unknown> | null;
		prescription_lines: unknown;
		lab_orders: unknown;
		updated_at: string;
	};

	const { data: prof } = await sb
		.from('profiles')
		.select('first_name, last_name, email')
		.eq('id', enc.provider_user_id)
		.maybeSingle();

	const { data: actionRows, error: actErr } = await sb
		.from('patient_consultation_action_items')
		.select('id, item_type, line_index, payload, status, completed_at, health_record_id')
		.eq('encounter_id', enc.id)
		.order('line_index', { ascending: true })
		.order('item_type', { ascending: false });

	let actionItems = actionRows || [];
	let actionPlanMessage: string | null = null;

	const actionsTableMissing = Boolean(actErr && /does not exist|schema cache/i.test(actErr.message));
	if (actErr && !actionsTableMissing) {
		console.error('[api/patient/consultations/:id GET] actions', actErr.message);
		return NextResponse.json({ error: 'Failed to load action plan' }, { status: 500 });
	}

	if (!actionsTableMissing && actionItems.length === 0 && hasNonEmptyRxOrLab(enc.prescription_lines, enc.lab_orders)) {
		await syncConsultationActionItemsOnFinalize(sb, {
			id: enc.id,
			appointment_id: enc.appointment_id,
			patient_user_id: enc.patient_user_id,
			prescription_lines: enc.prescription_lines,
			lab_orders: enc.lab_orders,
		});
		const { data: refetched, error: refErr } = await sb
			.from('patient_consultation_action_items')
			.select('id, item_type, line_index, payload, status, completed_at, health_record_id')
			.eq('encounter_id', enc.id)
			.order('line_index', { ascending: true })
			.order('item_type', { ascending: false });
		if (!refErr) {
			actionItems = refetched || [];
		}
		if (actionItems.length === 0 && hasNonEmptyRxOrLab(enc.prescription_lines, enc.lab_orders)) {
			actionPlanMessage =
				'Prescriptions and lab orders are on file, but the action checklist could not be created. Your administrator may need to apply the latest database migration (patient consultation action plans).';
		}
	} else if (actionsTableMissing && hasNonEmptyRxOrLab(enc.prescription_lines, enc.lab_orders)) {
		actionPlanMessage =
			'Prescriptions and lab orders from this visit are shown below. The step-by-step checklist will be available after your database is updated with the latest PayPill migration.';
	}

	const vt = row.visit_types as { label?: string } | { label?: string }[] | null | undefined;
	const visitLabel =
		(vt && !Array.isArray(vt) && vt.label) || (Array.isArray(vt) && vt[0]?.label) || slug || 'Visit';

	const vitals = enc.vitals && typeof enc.vitals === 'object' ? enc.vitals : {};

	return NextResponse.json({
		appointment: {
			id: row.id,
			appointment_date: row.appointment_date,
			appointment_time: row.appointment_time,
			reason: row.reason,
			status: row.status,
			confirmation_number: row.confirmation_number,
			visit_label: visitLabel,
		},
		encounter: {
			id: enc.id,
			updated_at: enc.updated_at,
			provider_name: formatName(prof || null),
			subjective: enc.subjective,
			objective: enc.objective,
			assessment: enc.assessment,
			plan: enc.plan,
			additional_notes: enc.additional_notes,
			vitals,
			prescription_lines: coerceJsonArray(enc.prescription_lines),
			lab_orders: coerceJsonArray(enc.lab_orders),
		},
		action_items: actionItems,
		action_plan_message: actionPlanMessage,
	});
}
