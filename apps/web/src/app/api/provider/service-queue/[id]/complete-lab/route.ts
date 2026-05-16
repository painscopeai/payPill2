import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getProviderPortalAccess } from '@/server/provider/providerPortalAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/provider/service-queue/:id/complete-lab — mark lab order fulfilled with result summary. */
export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	if (!ctx.providerOrgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const access = await getProviderPortalAccess(sb, ctx.providerOrgId);
	if (!access.isLaboratory) {
		return NextResponse.json({ error: 'Lab completion is only available for laboratory practices.' }, { status: 403 });
	}

	const { id } = await context.params;
	const body = (await request.json().catch(() => ({}))) as {
		lab_result_summary?: string;
		notes?: string | null;
		status?: string;
	};

	const labResult = String(body.lab_result_summary || '').trim();
	if (!labResult) {
		return NextResponse.json({ error: 'lab_result_summary is required' }, { status: 400 });
	}

	const { data: queueItem, error: qErr } = await sb
		.from('provider_service_queue_items')
		.select('*')
		.eq('id', id)
		.eq('routed_to', 'laboratory')
		.eq('assignment_mode', 'assigned')
		.eq('fulfillment_org_id', ctx.providerOrgId)
		.maybeSingle();
	if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
	if (!queueItem) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
	if (queueItem.status === 'completed') {
		return NextResponse.json({ error: 'Already completed' }, { status: 400 });
	}

	const payload = (queueItem.payload && typeof queueItem.payload === 'object'
		? queueItem.payload
		: {}) as Record<string, unknown>;
	const testName = String(payload.test_name || 'Lab test').trim();
	const now = new Date().toISOString();
	const notes = body.notes != null ? String(body.notes).trim() || null : null;

	const noteParts = [
		labResult,
		payload.code ? `Code: ${payload.code}` : null,
		payload.priority ? `Priority: ${payload.priority}` : null,
		`Queue item: ${id}`,
	].filter(Boolean);

	const { data: healthRow, error: hrErr } = await sb
		.from('patient_health_records')
		.insert({
			user_id: queueItem.patient_user_id,
			record_type: 'lab_result',
			title: testName,
			record_date: now.slice(0, 10),
			status: 'Released by laboratory',
			notes: noteParts.join('\n'),
		})
		.select('id')
		.single();
	if (hrErr) {
		console.error('[service-queue/complete-lab] health record', hrErr.message);
	}

	const { data: updated, error: uErr } = await sb
		.from('provider_service_queue_items')
		.update({
			status: 'completed',
			fulfilled_by: ctx.userId,
			fulfilled_at: now,
			fulfillment_notes: notes,
			lab_result_summary: labResult,
			updated_at: now,
		})
		.eq('id', id)
		.select('*')
		.single();
	if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

	return NextResponse.json({ item: updated, health_record_id: healthRow?.id || null });
}
