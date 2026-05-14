import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { isConsultationQueueVisit, visitSlugFromAppointmentRow } from '@/server/provider/consultationVisitSlugs';
import { syncConsultationActionItemsOnFinalize } from '@/server/patient/syncConsultationActionItemsOnFinalize';
import { syncConsultationInvoiceOnFinalize } from '@/server/provider/syncConsultationInvoiceOnFinalize';

function normalizeJsonArray(raw: unknown): unknown[] {
	if (Array.isArray(raw)) return raw;
	if (raw && typeof raw === 'string') {
		try {
			const p = JSON.parse(raw) as unknown;
			return Array.isArray(p) ? p : [];
		} catch {
			return [];
		}
	}
	return [];
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LoadedApt =
	| { ok: true; apt: Record<string, unknown>; slug: string }
	| { ok: false; error: string; status: number };

async function loadConsultationAppointment(
	sb: ReturnType<typeof getSupabaseAdmin>,
	providerOrgId: string,
	appointmentId: string,
): Promise<LoadedApt> {
	const { data: apt, error } = await sb
		.from('appointments')
		.select(
			`
      id,
      user_id,
      provider_id,
      provider_service_id,
      appointment_date,
      appointment_time,
      appointment_type,
      type,
      status,
      reason,
      confirmation_number,
      visit_types ( slug, label )
    `,
		)
		.eq('id', appointmentId)
		.maybeSingle();
	if (error || !apt) return { ok: false, error: 'Appointment not found', status: 404 };
	const row = apt as Record<string, unknown>;
	let inPractice = row.provider_id === providerOrgId;
	if (!inPractice && row.provider_service_id) {
		const { data: svc } = await sb
			.from('provider_services')
			.select('id')
			.eq('id', String(row.provider_service_id))
			.eq('provider_id', providerOrgId)
			.maybeSingle();
		inPractice = Boolean(svc);
	}
	if (!inPractice) {
		return { ok: false, error: 'Not part of your practice', status: 403 };
	}
	const slug = visitSlugFromAppointmentRow(row as never);
	if (!isConsultationQueueVisit(slug)) {
		return {
			ok: false,
			error: 'This appointment is not a consultation or follow-up visit.',
			status: 400,
		};
	}
	return { ok: true, apt: row, slug };
}

/** GET — appointment shell + patient + encounter draft (if any). */
export async function GET(request: NextRequest, ctx: { params: Promise<{ appointmentId: string }> }) {
	void request;
	const auth = await requireProvider(request);
	if (auth instanceof NextResponse) return auth;
	if (!auth.providerOrgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const { appointmentId } = await ctx.params;
	const sb = getSupabaseAdmin();
	const res = await loadConsultationAppointment(sb, auth.providerOrgId, appointmentId);
	if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });

	const apt = res.apt as {
		id: string;
		user_id: string;
		appointment_date: string;
		appointment_time: string | null;
		status: string | null;
		reason: string | null;
		confirmation_number: string | null;
	};

	const { data: profile } = await sb
		.from('profiles')
		.select('id, first_name, last_name, email, phone, date_of_birth')
		.eq('id', apt.user_id)
		.maybeSingle();

	const { data: encounter } = await sb
		.from('provider_consultation_encounters')
		.select('*')
		.eq('appointment_id', appointmentId)
		.maybeSingle();

	return NextResponse.json({
		appointment: {
			id: apt.id,
			appointment_date: apt.appointment_date,
			appointment_time: apt.appointment_time,
			status: apt.status,
			reason: apt.reason,
			confirmation_number: apt.confirmation_number,
			visit_slug: res.slug,
		},
		patient: profile,
		encounter: encounter || null,
	});
}

/** PUT — create/update SOAP encounter for this appointment. */
export async function PUT(request: NextRequest, ctx: { params: Promise<{ appointmentId: string }> }) {
	const auth = await requireProvider(request);
	if (auth instanceof NextResponse) return auth;
	if (!auth.providerOrgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const { appointmentId } = await ctx.params;
	const body = (await request.json().catch(() => ({}))) as {
		subjective?: string;
		objective?: string;
		assessment?: string;
		plan?: string;
		additional_notes?: string;
		vitals?: Record<string, unknown>;
		status?: string;
		prescription_lines?: unknown;
		lab_orders?: unknown;
	};

	const sb = getSupabaseAdmin();
	const res = await loadConsultationAppointment(sb, auth.providerOrgId, appointmentId);
	if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });

	const apt = res.apt as { id: string; user_id: string };

	const status = body.status === 'finalized' ? 'finalized' : 'draft';
	const vitals = body.vitals && typeof body.vitals === 'object' ? body.vitals : {};
	const prescription_lines = normalizeJsonArray(body.prescription_lines);
	const lab_orders = normalizeJsonArray(body.lab_orders);

	const payload = {
		appointment_id: appointmentId,
		patient_user_id: apt.user_id,
		provider_user_id: auth.userId,
		subjective: body.subjective ?? null,
		objective: body.objective ?? null,
		assessment: body.assessment ?? null,
		plan: body.plan ?? null,
		additional_notes: body.additional_notes ?? null,
		vitals,
		prescription_lines,
		lab_orders,
		status,
		updated_at: new Date().toISOString(),
	};

	const { data: existing } = await sb
		.from('provider_consultation_encounters')
		.select('id')
		.eq('appointment_id', appointmentId)
		.maybeSingle();

	let dbErr = null as { message?: string } | null;
	if (existing && typeof existing === 'object' && 'id' in existing && (existing as { id: string }).id) {
		const { error } = await sb
			.from('provider_consultation_encounters')
			.update(payload)
			.eq('id', (existing as { id: string }).id);
		dbErr = error;
	} else {
		const { error } = await sb.from('provider_consultation_encounters').insert(payload);
		dbErr = error;
	}

	if (dbErr) {
		console.error('[api/provider/consultations/encounter]', dbErr.message);
		return NextResponse.json({ error: 'Failed to save encounter' }, { status: 500 });
	}

	const { data: encounter, error: selErr } = await sb
		.from('provider_consultation_encounters')
		.select('*')
		.eq('appointment_id', appointmentId)
		.single();
	if (selErr || !encounter) {
		return NextResponse.json({ error: 'Encounter saved but could not reload.' }, { status: 500 });
	}

	const enc = encounter as {
		id: string;
		appointment_id: string;
		patient_user_id: string;
		prescription_lines?: unknown;
		lab_orders?: unknown;
		status: string;
	};
	if (enc.status === 'finalized') {
		await syncConsultationActionItemsOnFinalize(sb, {
			id: enc.id,
			appointment_id: enc.appointment_id,
			patient_user_id: enc.patient_user_id,
			prescription_lines: enc.prescription_lines,
			lab_orders: enc.lab_orders,
		});

		const inv = await syncConsultationInvoiceOnFinalize(sb, {
			encounterId: enc.id,
			appointmentId: enc.appointment_id,
			patientUserId: enc.patient_user_id,
			providerUserId: auth.userId,
			providerOrgId: auth.providerOrgId,
			appointmentRow: res.apt as Record<string, unknown>,
		});
		if (!inv.created && inv.reason && !['invoice_exists', 'unique_encounter'].includes(inv.reason)) {
			console.warn('[api/provider/consultations/encounter] invoice sync skipped', inv.reason);
		}

		const { data: aptStatusRow } = await sb.from('appointments').select('status').eq('id', appointmentId).maybeSingle();
		const curAptStatus = String((aptStatusRow as { status?: string | null } | null)?.status || '').toLowerCase();
		if (!['cancelled', 'canceled', 'no_show', 'no-show'].includes(curAptStatus)) {
			const { error: aptUpErr } = await sb
				.from('appointments')
				.update({ status: 'completed', updated_at: new Date().toISOString() })
				.eq('id', appointmentId);
			if (aptUpErr) {
				console.error('[api/provider/consultations/encounter] mark appointment completed', aptUpErr.message);
			}
		}
	}

	return NextResponse.json({ encounter });
}
