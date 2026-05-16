import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { buildPatientCoverageSummary } from '@/server/patient/buildPatientCoverageSummary';
import { loadProviderPatientRecordsBundle } from '@/server/provider/loadProviderPatientRecordsBundle';
import { getProviderPortalAccess } from '@/server/provider/providerPortalAccess';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function providerMayViewPatient(
	sb: SupabaseClient,
	providerUserId: string,
	providerOrgId: string | null,
	patientId: string,
): Promise<boolean> {
	const { data: rel } = await sb
		.from('patient_provider_relationships')
		.select('id')
		.eq('provider_id', providerUserId)
		.eq('patient_id', patientId)
		.maybeSingle();
	if (rel) return true;
	if (!providerOrgId) return false;
	const { data: apt } = await sb
		.from('appointments')
		.select('id')
		.eq('user_id', patientId)
		.eq('provider_id', providerOrgId)
		.limit(1)
		.maybeSingle();
	return Boolean(apt);
}

async function providerMayViewPatientProfile(
	sb: SupabaseClient,
	providerUserId: string,
	providerOrgId: string | null,
	patientId: string,
	routedTo: 'pharmacist' | 'laboratory' | null,
): Promise<boolean> {
	if (await providerMayViewPatient(sb, providerUserId, providerOrgId, patientId)) return true;
	if (!routedTo) return false;
	const { data } = await sb
		.from('provider_service_queue_items')
		.select('id')
		.eq('patient_user_id', patientId)
		.eq('routed_to', routedTo)
		.limit(1)
		.maybeSingle();
	return Boolean(data);
}

/** GET /api/provider/patients/:id — clinical: full chart; pharmacy/lab: profile only. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const authCtx = await requireProvider(request);
	if (authCtx instanceof NextResponse) return authCtx;

	const { id: patientId } = await ctx.params;
	if (!patientId) {
		return NextResponse.json({ error: 'Missing patient id' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const portalAccess = await getProviderPortalAccess(sb, authCtx.providerOrgId);
	const routedTo = portalAccess.isPharmacy ? 'pharmacist' : portalAccess.isLaboratory ? 'laboratory' : null;

	const allowed = await providerMayViewPatientProfile(
		sb,
		authCtx.userId,
		authCtx.providerOrgId,
		patientId,
		routedTo,
	);
	if (!allowed) {
		return NextResponse.json({ error: 'You do not have access to this patient' }, { status: 403 });
	}

	const { data: profile, error: pErr } = await sb.from('profiles').select('*').eq('id', patientId).maybeSingle();
	if (pErr || !profile) {
		return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
	}

	if (!portalAccess.canViewFullPatientRecords) {
		const { data: queueItems } = await sb
			.from('provider_service_queue_items')
			.select('id, item_type, status, payload, created_at, fulfilled_at, lab_result_summary')
			.eq('patient_user_id', patientId)
			.eq('routed_to', routedTo || '')
			.order('created_at', { ascending: false })
			.limit(50);

		return NextResponse.json({
			patient_id: patientId,
			profile,
			profile_only: true,
			portal_profile: portalAccess.portalProfile,
			service_queue_items: queueItems || [],
			message:
				'Clinical health records are only available to clinical practices. Use the service queue to fulfill orders routed from consultations.',
		});
	}

	const [coverage_summary, recordsBundle, { data: appointments, error: aptErr }] = await Promise.all([
		buildPatientCoverageSummary(sb, patientId).catch(() => null),
		loadProviderPatientRecordsBundle(sb, patientId),
		authCtx.providerOrgId
			? sb
					.from('appointments')
					.select(
						'id, appointment_date, appointment_time, appointment_type, type, status, reason, notes, created_at',
					)
					.eq('user_id', patientId)
					.eq('provider_id', authCtx.providerOrgId)
					.order('appointment_date', { ascending: false })
					.limit(40)
			: Promise.resolve({ data: [], error: null }),
	]);

	if (aptErr) console.error('[api/provider/patients/:id GET] appointments', aptErr.message);

	return NextResponse.json({
		patient_id: patientId,
		profile,
		profile_only: false,
		portal_profile: portalAccess.portalProfile,
		coverage_summary,
		appointments: appointments || [],
		...recordsBundle,
	});
}

/** PUT /api/provider/patients/:id — notes + optional treatment plan metadata (legacy parity). */
export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const authCtx = await requireProvider(request);
	if (authCtx instanceof NextResponse) return authCtx;

	const { id: patientId } = await ctx.params;
	const body = (await request.json().catch(() => ({}))) as {
		treatment_plan?: unknown;
		notes?: string;
	};

	const sb = getSupabaseAdmin();
	const providerId = authCtx.userId;
	const portalAccess = await getProviderPortalAccess(sb, authCtx.providerOrgId);
	if (!portalAccess.canViewFullPatientRecords) {
		return NextResponse.json({ error: 'Only clinical providers can add chart notes.' }, { status: 403 });
	}

	const allowed = await providerMayViewPatient(sb, providerId, authCtx.providerOrgId, patientId);
	if (!allowed) {
		return NextResponse.json({ error: 'You do not have access to this patient' }, { status: 403 });
	}

	if (body.notes) {
		const { error: insErr } = await sb.from('clinical_notes').insert({
			user_id: patientId,
			provider_id: providerId,
			note_content: body.notes,
			date_created: new Date().toISOString(),
		});
		if (insErr) {
			console.error('[api/provider/patients/:id]', insErr.message);
			return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
		}
	}

	return NextResponse.json({
		patient_id: patientId,
		treatment_plan: body.treatment_plan ?? null,
		updated: true,
	});
}
