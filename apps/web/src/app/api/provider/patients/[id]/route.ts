import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { buildPatientCoverageSummary } from '@/server/patient/buildPatientCoverageSummary';
import { verifyProviderRecordsAccessToken } from '@/server/auth/providerRecordsAccessToken';
import { loadProviderPatientRecordsBundle } from '@/server/provider/loadProviderPatientRecordsBundle';
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

/**
 * GET /api/provider/patients/:id
 * - Default (`view=profile`): demographics, coverage, practice appointments — no Records-tab PHI.
 * - `view=records` + header `X-Provider-Records-Token`: health records bundle after password step-up.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const authCtx = await requireProvider(request);
	if (authCtx instanceof NextResponse) return authCtx;

	const { id: patientId } = await ctx.params;
	if (!patientId) {
		return NextResponse.json({ error: 'Missing patient id' }, { status: 400 });
	}

	const view = request.nextUrl.searchParams.get('view') || 'profile';

	const sb = getSupabaseAdmin();
	const allowed = await providerMayViewPatient(sb, authCtx.userId, authCtx.providerOrgId, patientId);
	if (!allowed) {
		return NextResponse.json({ error: 'You do not have access to this patient' }, { status: 403 });
	}

	if (view === 'records') {
		const token = request.headers.get('x-provider-records-token');
		const ok = verifyProviderRecordsAccessToken(token, {
			providerId: authCtx.userId,
			patientId,
		});
		if (!ok) {
			return NextResponse.json(
				{ error: 'Records access requires password verification', code: 'RECORDS_AUTH_REQUIRED' },
				{ status: 403 },
			);
		}
		const bundle = await loadProviderPatientRecordsBundle(sb, patientId);
		return NextResponse.json({ patient_id: patientId, ...bundle });
	}

	const { data: profile, error: pErr } = await sb.from('profiles').select('*').eq('id', patientId).maybeSingle();
	if (pErr || !profile) {
		return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
	}

	const [coverage_summary, { data: appointments, error: aptErr }] = await Promise.all([
		buildPatientCoverageSummary(sb, patientId).catch(() => null),
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
		coverage_summary,
		appointments: appointments || [],
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
