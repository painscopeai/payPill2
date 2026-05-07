import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/patient/messages/:recipientId - thread for one broadcast (recipient row id).
 *
 * Auto-marks recipient.read_at and any unread employer replies as read.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const { id } = await params;

	const sb = getSupabaseAdmin();
	const { data: rec, error: rErr } = await sb
		.from('employer_broadcast_recipients')
		.select('id, broadcast_id, employer_id, patient_user_id, read_at, created_at')
		.eq('id', id)
		.eq('patient_user_id', uid)
		.maybeSingle();
	if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
	if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const [{ data: broadcast }, { data: employerProfile }, { data: replies }] = await Promise.all([
		sb
			.from('employer_broadcasts')
			.select('id, subject, body, created_at')
			.eq('id', rec.broadcast_id)
			.maybeSingle(),
		sb
			.from('profiles')
			.select('id, company_name, name, email')
			.eq('id', rec.employer_id)
			.maybeSingle(),
		sb
			.from('employer_broadcast_replies')
			.select('id, sender_role, sender_user_id, body, created_at, read_at')
			.eq('recipient_id', rec.id)
			.order('created_at', { ascending: true }),
	]);

	const nowIso = new Date().toISOString();
	if (!rec.read_at) {
		await sb.from('employer_broadcast_recipients').update({ read_at: nowIso }).eq('id', rec.id);
	}
	await sb
		.from('employer_broadcast_replies')
		.update({ read_at: nowIso })
		.eq('recipient_id', rec.id)
		.eq('sender_role', 'employer')
		.is('read_at', null);

	return NextResponse.json({
		recipient: rec,
		broadcast,
		employer: employerProfile,
		replies: replies ?? [],
	});
}
