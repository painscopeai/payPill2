import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

	const { data: relationship } = await sb
		.from('patient_provider_relationships')
		.select('id')
		.eq('provider_id', providerId)
		.eq('patient_id', patientId)
		.maybeSingle();

	if (!relationship) {
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
