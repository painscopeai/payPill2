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
	scope?: 'all' | 'single';
};

/**
 * POST /api/employer/broadcasts/:id/replies
 *
 * Employer replies either:
 * - to one recipient thread (scope=single + recipient_id), or
 * - as group follow-up to all recipients (scope=all).
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
	const scope = String(body.scope ?? '').trim().toLowerCase();
	if (!text) return NextResponse.json({ error: 'Reply body is required' }, { status: 400 });
	const isAll = scope === 'all';
	if (!isAll && !recipientId) {
		return NextResponse.json({ error: 'recipient_id is required' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();

	const recipientsQuery = sb
		.from('employer_broadcast_recipients')
		.select('id, broadcast_id, employer_id, patient_user_id')
		.eq('broadcast_id', id)
		.eq('employer_id', ctx.employerId);
	const { data: recipientRows, error: recErr } = isAll
		? await recipientsQuery
		: await recipientsQuery.eq('id', recipientId);
	if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
	const recipients = recipientRows || [];
	if (recipients.length === 0) {
		return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
	}

	const inserts = recipients.map((rec: { id: string; patient_user_id: string }) => ({
			broadcast_id: id,
			recipient_id: rec.id,
			employer_id: ctx.employerId,
			patient_user_id: rec.patient_user_id,
			sender_user_id: ctx.employerId,
			sender_role: 'employer',
			body: text,
		}));
	const { data: insertedReplies, error: insErr } = await sb
		.from('employer_broadcast_replies')
		.insert(inserts)
		.select('*')
		.limit(5000);
	if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

	await sb.from('notifications').insert(recipients.map((rec: { patient_user_id: string }) => ({
		user_id: rec.patient_user_id,
		title: 'New reply from your employer',
		body: text.slice(0, 240),
		category: 'employer_reply',
		link: '/patient/messages',
	})));

	return NextResponse.json(
		{ replies: insertedReplies || [], recipientCount: recipients.length },
		{ status: 201 },
	);
}
