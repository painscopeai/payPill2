import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { isConsultationQueueVisit, visitSlugFromAppointmentRow } from '@/server/provider/consultationVisitSlugs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatName(p: { first_name?: string | null; last_name?: string | null; email?: string | null } | null): string {
	if (!p) return 'Provider';
	const n = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
	return n || p.email || 'Provider';
}

/** GET /api/patient/consultations/[appointmentId] — one finalized consultation + action items. */
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
		.select('id, status, updated_at, plan, provider_user_id')
		.eq('appointment_id', appointmentId)
		.maybeSingle();

	if (encErr) {
		console.error('[api/patient/consultations/:id GET]', encErr.message);
		return NextResponse.json({ error: 'Failed to load encounter' }, { status: 500 });
	}
	if (!encounter || encounter.status !== 'finalized') {
		return NextResponse.json({ error: 'No finalized consultation for this visit yet.' }, { status: 404 });
	}

	const { data: prof } = await sb
		.from('profiles')
		.select('first_name, last_name, email')
		.eq('id', encounter.provider_user_id)
		.maybeSingle();

	const { data: actionItems, error: actErr } = await sb
		.from('patient_consultation_action_items')
		.select('id, item_type, line_index, payload, status, completed_at, health_record_id')
		.eq('encounter_id', encounter.id)
		.order('line_index', { ascending: true })
		.order('item_type', { ascending: false });

	if (actErr && !/does not exist|schema cache/i.test(actErr.message)) {
		console.error('[api/patient/consultations/:id GET] actions', actErr.message);
		return NextResponse.json({ error: 'Failed to load action plan' }, { status: 500 });
	}

	const vt = row.visit_types as { label?: string } | { label?: string }[] | null | undefined;
	const visitLabel =
		(vt && !Array.isArray(vt) && vt.label) || (Array.isArray(vt) && vt[0]?.label) || slug || 'Visit';

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
			id: encounter.id,
			updated_at: encounter.updated_at,
			plan: encounter.plan,
			provider_name: formatName(prof || null),
		},
		action_items: actionItems || [],
	});
}
