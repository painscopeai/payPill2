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

/** GET /api/patient/consultations — finalized visits with action-plan summary. */
export async function GET(request: NextRequest) {
	void request;
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const sb = getSupabaseAdmin();

	const { data: encounters, error: encErr } = await sb
		.from('provider_consultation_encounters')
		.select('id, appointment_id, provider_user_id, updated_at, plan')
		.eq('patient_user_id', uid)
		.eq('status', 'finalized')
		.order('updated_at', { ascending: false })
		.limit(200);

	if (encErr) {
		if (/does not exist|schema cache/i.test(encErr.message)) {
			return NextResponse.json({ items: [], message: 'Consultation history is not available yet.' });
		}
		console.error('[api/patient/consultations GET]', encErr.message);
		return NextResponse.json({ error: 'Failed to load consultations' }, { status: 500 });
	}

	const list = encounters || [];
	if (!list.length) return NextResponse.json({ items: [] });

	const aptIds = [...new Set(list.map((e: { appointment_id: string }) => e.appointment_id))];
	const { data: apts, error: aptErr } = await sb
		.from('appointments')
		.select(
			`
      id,
      appointment_date,
      appointment_time,
      reason,
      status,
      appointment_type,
      type,
      visit_types ( slug, label )
    `,
		)
		.in('id', aptIds);

	if (aptErr) {
		console.error('[api/patient/consultations GET] appointments', aptErr.message);
		return NextResponse.json({ error: 'Failed to load appointments' }, { status: 500 });
	}

	const aptMap = new Map((apts || []).map((a: { id: string }) => [a.id, a]));

	const provIds = [...new Set(list.map((e: { provider_user_id: string }) => e.provider_user_id))];
	const { data: profs } = await sb.from('profiles').select('id, first_name, last_name, email').in('id', provIds);
	const profMap = new Map((profs || []).map((p: { id: string }) => [p.id, p]));

	const encIds = list.map((e: { id: string }) => e.id);
	const { data: actions, error: actErr } = await sb
		.from('patient_consultation_action_items')
		.select('encounter_id, status')
		.in('encounter_id', encIds);

	if (actErr && !/does not exist|schema cache/i.test(actErr.message)) {
		console.error('[api/patient/consultations GET] actions', actErr.message);
	}

	const pendingByEnc = new Map<string, number>();
	const totalByEnc = new Map<string, number>();
	for (const row of actions || []) {
		const eid = (row as { encounter_id: string }).encounter_id;
		totalByEnc.set(eid, (totalByEnc.get(eid) || 0) + 1);
		if ((row as { status: string }).status === 'pending') {
			pendingByEnc.set(eid, (pendingByEnc.get(eid) || 0) + 1);
		}
	}

	const items = list
		.map((enc: { id: string; appointment_id: string; provider_user_id: string; updated_at: string; plan: string | null }) => {
			const apt = aptMap.get(enc.appointment_id) as Record<string, unknown> | undefined;
			if (!apt) return null;
			const slug = visitSlugFromAppointmentRow(apt as never);
			if (!isConsultationQueueVisit(slug)) return null;
			const vt = apt.visit_types as { slug?: string; label?: string } | { slug?: string; label?: string }[] | null | undefined;
			const visitLabel =
				(vt && !Array.isArray(vt) && vt.label) ||
				(Array.isArray(vt) && vt[0]?.label) ||
				slug ||
				'Visit';
			const prof = profMap.get(enc.provider_user_id);
			return {
				encounter_id: enc.id,
				appointment_id: enc.appointment_id,
				appointment_date: apt.appointment_date,
				appointment_time: apt.appointment_time,
				reason: apt.reason,
				appointment_status: apt.status,
				visit_label: visitLabel,
				provider_name: formatName(prof || null),
				updated_at: enc.updated_at,
				plan_summary: enc.plan ? String(enc.plan).slice(0, 280) : null,
				action_plan_pending: pendingByEnc.get(enc.id) || 0,
				action_plan_total: totalByEnc.get(enc.id) || 0,
			};
		})
		.filter(Boolean);

	return NextResponse.json({ items });
}
