import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireEmployer } from '@/server/auth/requireEmployer';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ReplyBody = {
	body?: string;
	recipient_id?: string;
	patient_user_id?: string;
};

/**
 * POST /api/employer/broadcasts/:id/replies
 *
 * Employer replies to a specific recipient thread (recipient_id required).
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await params;

	let body: ReplyBody;
	try {
		body = (await request.json()) as ReplyBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const text = String(body.body ?? '').trim();
	const recipientId = String(body.recipient_id ?? '').trim();
	if (!text) return NextResponse.json({ error: 'Reply body is required' }, { status: 400 });
	if (!recipientId) return NextResponse.json({ error: 'recipient_id is required' }, { status: 400 });

	const sb = getSupabaseAdmin();

	const { data: rec, error: recErr } = await sb
		.from('employer_broadcast_recipients')
		.select('id, broadcast_id, employer_id, patient_user_id')
		.eq('id', recipientId)
		.eq('broadcast_id', id)
		.eq('employer_id', ctx.employerId)
		.maybeSingle();
	if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
	if (!rec) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });

	const { data: reply, error: insErr } = await sb
		.from('employer_broadcast_replies')
		.insert({
			broadcast_id: id,
			recipient_id: rec.id,
			employer_id: ctx.employerId,
			patient_user_id: rec.patient_user_id,
			sender_user_id: ctx.employerId,
			sender_role: 'employer',
			body: text,
		})
		.select('*')
		.maybeSingle();
	if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

	await sb.from('notifications').insert({
		user_id: rec.patient_user_id,
		title: 'New reply from your employer',
		body: text.slice(0, 240),
		category: 'employer_reply',
		link: '/patient/messages',
	});

	return NextResponse.json({ reply }, { status: 201 });
}
