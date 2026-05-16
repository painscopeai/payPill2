import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { isConsultationQueueVisit, visitSlugFromAppointmentRow } from '@/server/provider/consultationVisitSlugs';
import { fetchAppointmentsForPracticeOrg } from '@/server/provider/fetchAppointmentsForPracticeOrg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/provider/consultations — consultation & follow-up bookings for the linked practice
 * (patients who selected these visit types when booking).
 */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;

	const sb = getSupabaseAdmin();
	if (!ctx.providerOrgId) {
		return NextResponse.json({
			items: [],
			message: 'Link your practice in onboarding to see consultation and follow-up bookings.',
		});
	}

	const consultSelect = `
      id,
      user_id,
      appointment_date,
      appointment_time,
      appointment_type,
      type,
      status,
      reason,
      confirmation_number,
      visit_type_id,
      visit_types ( slug, label )
    `;

	const { rows, error } = await fetchAppointmentsForPracticeOrg(sb, ctx.providerOrgId, consultSelect, {
		limitDirect: 400,
		limitService: 400,
	});

	if (error) {
		console.error('[api/provider/consultations]', error);
		return NextResponse.json({ error: 'Failed to load consultations' }, { status: 500 });
	}

	const filtered = (rows || []).filter((r) => isConsultationQueueVisit(visitSlugFromAppointmentRow(r as never)));
	filtered.sort((a, b) => {
		const ra = a as { appointment_date: string; appointment_time?: string | null };
		const rb = b as { appointment_date: string; appointment_time?: string | null };
		const sa = `${ra.appointment_date}T${String(ra.appointment_time || '00:00:00').slice(0, 8)}`;
		const sb2 = `${rb.appointment_date}T${String(rb.appointment_time || '00:00:00').slice(0, 8)}`;
		return sb2.localeCompare(sa);
	});

	const userIds = [...new Set(filtered.map((r) => (r as { user_id?: string }).user_id).filter(Boolean))] as string[];
	let profileById = new Map<
		string,
		{
			first_name?: string | null;
			last_name?: string | null;
			email?: string | null;
			phone?: string | null;
			date_of_birth?: string | null;
			gender?: string | null;
		}
	>();
	if (userIds.length) {
		const { data: profs } = await sb
			.from('profiles')
			.select('id, first_name, last_name, email, phone, date_of_birth, gender')
			.in('id', userIds);
		profileById = new Map((profs || []).map((p: { id: string }) => [p.id, p]));
	}

	const aptIds = filtered.map((r) => (r as { id: string }).id);
	let encounterByApt = new Map<string, { status: string; updated_at: string }>();
	if (aptIds.length) {
		const { data: enc } = await sb
			.from('provider_consultation_encounters')
			.select('appointment_id, status, updated_at')
			.in('appointment_id', aptIds);
		encounterByApt = new Map(
			(enc || []).map((e: { appointment_id: string; status: string; updated_at: string }) => [
				e.appointment_id,
				{ status: e.status, updated_at: e.updated_at },
			]),
		);
	}

	const items = filtered.map((raw) => {
		const r = raw as {
			id: string;
			user_id: string;
			appointment_date: string;
			appointment_time: string | null;
			appointment_type: string | null;
			type: string | null;
			status: string | null;
			reason: string | null;
			confirmation_number: string | null;
			visit_types?: { slug?: string; label?: string } | null;
		};
		const slug = visitSlugFromAppointmentRow(r);
		const vt = r.visit_types;
		const visitLabel =
			(vt && !Array.isArray(vt) && vt.label) ||
			(Array.isArray(vt) && vt[0]?.label) ||
			slug ||
			'Visit';
		const p = profileById.get(r.user_id);
		const patientName =
			[p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() || p?.email || 'Patient';
		const enc = encounterByApt.get(r.id);
		return {
			appointment_id: r.id,
			patient_user_id: r.user_id,
			patient_name: patientName,
			patient_email: p?.email || null,
			patient_phone: p?.phone || null,
			patient_date_of_birth: p?.date_of_birth || null,
			patient_gender: p?.gender || null,
			visit_slug: slug,
			visit_label: visitLabel,
			appointment_date: r.appointment_date,
			appointment_time: r.appointment_time,
			status: r.status || 'scheduled',
			reason: r.reason,
			confirmation_number: r.confirmation_number,
			encounter_status: enc?.status || null,
			encounter_updated_at: enc?.updated_at || null,
		};
	});

	return NextResponse.json({ items });
}
