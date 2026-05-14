import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { buildPatientCoverageSummary } from '@/server/patient/buildPatientCoverageSummary';
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

/** GET /api/provider/patients/:id — full profile + health record bundle for chart review. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const authCtx = await requireProvider(request);
	if (authCtx instanceof NextResponse) return authCtx;

	const { id: patientId } = await ctx.params;
	if (!patientId) {
		return NextResponse.json({ error: 'Missing patient id' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const allowed = await providerMayViewPatient(sb, authCtx.userId, authCtx.providerOrgId, patientId);
	if (!allowed) {
		return NextResponse.json({ error: 'You do not have access to this patient' }, { status: 403 });
	}

	const { data: profile, error: pErr } = await sb.from('profiles').select('*').eq('id', patientId).maybeSingle();
	if (pErr || !profile) {
		return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
	}

	const [
		coverage_summary,
		{ data: onboarding_steps, error: obErr },
		{ data: health_records, error: hrErr },
		{ data: clinical_notes, error: cnErr },
		{ data: prescriptions, error: rxErr },
		{ data: lab_results, error: labErr },
		{ data: appointments, error: aptErr },
	] = await Promise.all([
		buildPatientCoverageSummary(sb, patientId).catch(() => null),
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

	if (obErr) console.error('[api/provider/patients/:id GET] onboarding', obErr.message);
	if (hrErr) console.error('[api/provider/patients/:id GET] health_records', hrErr.message);
	if (cnErr) console.error('[api/provider/patients/:id GET] clinical_notes', cnErr.message);
	if (rxErr) console.error('[api/provider/patients/:id GET] prescriptions', rxErr.message);
	if (labErr) console.error('[api/provider/patients/:id GET] lab_results', labErr.message);
	if (aptErr) console.error('[api/provider/patients/:id GET] appointments', aptErr.message);

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

	return NextResponse.json({
		patient_id: patientId,
		profile,
		coverage_summary,
		onboarding_steps: onboarding_steps || [],
		health_records: health_records || [],
		clinical_notes: notesWithAuthors,
		prescriptions: prescriptions || [],
		lab_results: lab_results || [],
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
