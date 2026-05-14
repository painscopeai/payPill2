import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { blockWalkInEmployerMessaging } from '@/server/patient/walkInPatientMessaging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ReplyBody = { body?: string };

/**
 * POST /api/patient/messages/:recipientId/replies
 *
 * Patient sends a reply to its own thread. Notifies the employer.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const { id } = await params;

	let payload: ReplyBody;
	try {
		payload = (await request.json()) as ReplyBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}
	const text = String(payload.body ?? '').trim();
	if (!text) return NextResponse.json({ error: 'Reply body is required' }, { status: 400 });

	const sb = getSupabaseAdmin();
	const walkInBlock = await blockWalkInEmployerMessaging(sb, uid);
	if (walkInBlock) return walkInBlock;

	const { data: rec, error: rErr } = await sb
		.from('employer_broadcast_recipients')
		.select('id, broadcast_id, employer_id, patient_user_id')
		.eq('id', id)
		.eq('patient_user_id', uid)
		.maybeSingle();
	if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
	if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const { data: reply, error: insErr } = await sb
		.from('employer_broadcast_replies')
		.insert({
			broadcast_id: rec.broadcast_id,
			recipient_id: rec.id,
			employer_id: rec.employer_id,
			patient_user_id: uid,
			sender_user_id: uid,
			sender_role: 'patient',
			body: text,
		})
		.select('*')
		.maybeSingle();
	if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

	await sb.from('notifications').insert({
		user_id: rec.employer_id,
		title: 'New reply from an employee',
		body: text.slice(0, 240),
		category: 'patient_reply',
		link: '/employer/messaging',
	});

	return NextResponse.json({ reply }, { status: 201 });
}
