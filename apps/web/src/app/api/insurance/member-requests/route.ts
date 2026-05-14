import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireInsurance } from '@/server/auth/requireInsurance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET — pending insurance change requests for this insurance org. */
export async function GET(request: NextRequest) {
	const ctx = await requireInsurance(request);
	if (ctx instanceof NextResponse) return ctx;
	const sb = getSupabaseAdmin();

	const { data: rows, error } = await sb
		.from('patient_insurance_change_requests')
		.select(
			'id, patient_user_id, previous_insurance_user_id, previous_member_id, requested_insurance_user_id, requested_member_id, status, created_at, reviewer_note',
		)
		.eq('requested_insurance_user_id', ctx.insuranceId)
		.eq('status', 'pending')
		.order('created_at', { ascending: false })
		.limit(200);

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	const patientIds = [...new Set((rows || []).map((r: { patient_user_id: string }) => r.patient_user_id))];
	const { data: patients } = patientIds.length
		? await sb.from('profiles').select('id, first_name, last_name, name, email').in('id', patientIds)
		: { data: [] };

	const byPatient = new Map(
		((patients || []) as { id: string; first_name: string | null; last_name: string | null; name: string | null; email: string | null }[]).map(
			(p) => [
				p.id,
				[p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.name || p.email || p.id,
			],
		),
	);

	const items = (rows || []).map((r: Record<string, unknown>) => ({
		...r,
		patient_display_name: byPatient.get(String(r.patient_user_id)) || String(r.patient_user_id),
	}));

	return NextResponse.json({ items });
}

/** PATCH — approve or reject a pending request (body: id, action, reviewer_note?). */
export async function PATCH(request: NextRequest) {
	const ctx = await requireInsurance(request);
	if (ctx instanceof NextResponse) return ctx;
	const sb = getSupabaseAdmin();

	let body: { id?: string; action?: string; reviewer_note?: string | null };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const id = String(body.id || '').trim();
	const action = String(body.action || '').trim().toLowerCase();
	if (!id || (action !== 'approve' && action !== 'reject')) {
		return NextResponse.json({ error: 'id and action (approve|reject) are required' }, { status: 400 });
	}

	const { data: row, error: fetchErr } = await sb
		.from('patient_insurance_change_requests')
		.select('*')
		.eq('id', id)
		.eq('requested_insurance_user_id', ctx.insuranceId)
		.eq('status', 'pending')
		.maybeSingle();

	if (fetchErr || !row) {
		return NextResponse.json({ error: 'Request not found or not pending for your organization' }, { status: 404 });
	}

	const r = row as {
		id: string;
		patient_user_id: string;
		requested_insurance_user_id: string;
		requested_member_id: string;
	};

	const reviewer_note = body.reviewer_note != null ? String(body.reviewer_note).trim() || null : null;
	const now = new Date().toISOString();

	if (action === 'reject') {
		const { error: upErr } = await sb
			.from('patient_insurance_change_requests')
			.update({
				status: 'rejected',
				reviewed_by: ctx.insuranceId,
				reviewed_at: now,
				reviewer_note,
			})
			.eq('id', id);
		if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
		return NextResponse.json({ success: true, status: 'rejected' });
	}

	// approve: update patient profile + request
	const { error: profErr } = await sb
		.from('profiles')
		.update({
			primary_insurance_user_id: r.requested_insurance_user_id,
			insurance_member_id: r.requested_member_id,
			patient_coverage_source: 'walk_in',
		})
		.eq('id', r.patient_user_id);

	if (profErr) {
		console.error('[member-requests PATCH] profile update', profErr.message);
		return NextResponse.json({ error: profErr.message }, { status: 500 });
	}

	const { error: upErr } = await sb
		.from('patient_insurance_change_requests')
		.update({
			status: 'approved',
			reviewed_by: ctx.insuranceId,
			reviewed_at: now,
			reviewer_note,
		})
		.eq('id', id);

	if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

	return NextResponse.json({ success: true, status: 'approved' });
}
