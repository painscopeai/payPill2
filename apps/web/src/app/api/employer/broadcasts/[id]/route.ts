import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireEmployer } from '@/server/auth/requireEmployer';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/employer/broadcasts/:id
 *
 * Returns broadcast + recipients (with names) + replies thread.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await params;

	const sb = getSupabaseAdmin();

	const { data: broadcast, error: bErr } = await sb
		.from('employer_broadcasts')
		.select('*')
		.eq('id', id)
		.eq('employer_id', ctx.employerId)
		.maybeSingle();
	if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
	if (!broadcast) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const [{ data: recipients }, { data: replies }] = await Promise.all([
		sb
			.from('employer_broadcast_recipients')
			.select('id, patient_user_id, read_at, created_at')
			.eq('broadcast_id', id),
		sb
			.from('employer_broadcast_replies')
			.select('id, recipient_id, sender_user_id, sender_role, body, created_at, read_at, patient_user_id')
			.eq('broadcast_id', id)
			.order('created_at', { ascending: true }),
	]);

	const userIds = new Set<string>();
	(recipients || []).forEach((r: { patient_user_id: string }) => userIds.add(r.patient_user_id));
	(replies || []).forEach((r: { sender_user_id: string }) => userIds.add(r.sender_user_id));

	let profilesById = new Map<string, { id: string; first_name: string | null; last_name: string | null; email: string | null }>();
	if (userIds.size > 0) {
		const { data: profs } = await sb
			.from('profiles')
			.select('id, first_name, last_name, email')
			.in('id', Array.from(userIds));
		profilesById = new Map((profs || []).map((p: { id: string }) => [p.id, p as never]));
	}

	const enrichedRecipients = (recipients || []).map((r: { id: string; patient_user_id: string; read_at: string | null; created_at: string }) => {
		const p = profilesById.get(r.patient_user_id);
		return {
			...r,
			name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email : null,
			email: p?.email || null,
		};
	});
	const enrichedReplies = (replies || []).map((r: { id: string; sender_user_id: string }) => {
		const p = profilesById.get(r.sender_user_id);
		return {
			...r,
			sender_name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email : null,
			sender_email: p?.email || null,
		};
	});

	await sb
		.from('employer_broadcast_replies')
		.update({ read_at: new Date().toISOString() })
		.eq('broadcast_id', id)
		.eq('employer_id', ctx.employerId)
		.eq('sender_role', 'patient')
		.is('read_at', null);

	return NextResponse.json({
		broadcast,
		recipients: enrichedRecipients,
		replies: enrichedReplies,
	});
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await params;

	const sb = getSupabaseAdmin();
	const { error } = await sb
		.from('employer_broadcasts')
		.delete()
		.eq('id', id)
		.eq('employer_id', ctx.employerId);
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ ok: true });
}
