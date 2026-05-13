import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/patients — relationships + patient profile + onboarding summary (replaces legacy /provider/patients). */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const sb = getSupabaseAdmin();
	const providerId = ctx.userId;

	const { data: relationships, error } = await sb
		.from('patient_provider_relationships')
		.select('*')
		.eq('provider_id', providerId);

	if (error) {
		console.error('[api/provider/patients]', error.message);
		return NextResponse.json({ error: 'Failed to load patients' }, { status: 500 });
	}

	const patientsWithDetails = await Promise.all(
		(relationships || []).map(async (relationship: { patient_id: string }) => {
			try {
				const { data: user } = await sb.from('profiles').select('*').eq('id', relationship.patient_id).maybeSingle();

				const { data: steps } = await sb
					.from('patient_onboarding_steps')
					.select('step, data')
					.eq('user_id', relationship.patient_id)
					.limit(20);

				const health_summary = Object.fromEntries((steps || []).map((s: { step: number; data: unknown }) => [`step_${s.step}`, s.data]));

				return {
					...relationship,
					patient_details: user,
					health_summary,
				};
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : String(e);
				console.warn(`[api/provider/patients] patient ${relationship.patient_id}: ${msg}`);
				return relationship;
			}
		}),
	);

	return NextResponse.json(patientsWithDetails);
}
