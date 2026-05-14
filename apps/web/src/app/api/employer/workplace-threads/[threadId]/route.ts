import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireEmployer } from '@/server/auth/requireEmployer';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — thread + messages (employer view); marks employee-sent unread as read.
 */
export async function GET(
	request: NextRequest,
	ctx: { params: Promise<{ threadId: string }> },
) {
	void request;
	const auth = await requireEmployer(request);
	if (auth instanceof NextResponse) return auth;
	const { threadId } = await ctx.params;
	const tid = String(threadId || '').trim();
	if (!tid) return NextResponse.json({ error: 'Invalid thread' }, { status: 400 });

	const sb = getSupabaseAdmin();
	const { data: thread, error } = await sb
		.from('workplace_direct_threads')
		.select('*')
		.eq('id', tid)
		.eq('employer_user_id', auth.employerId)
		.maybeSingle();
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const nowIso = new Date().toISOString();
	await sb
		.from('workplace_direct_messages')
		.update({ read_at: nowIso })
		.eq('thread_id', tid)
		.neq('sender_user_id', auth.employerId)
		.is('read_at', null);

	const [{ data: messages }, { data: employee }] = await Promise.all([
		sb
			.from('workplace_direct_messages')
			.select('id, sender_user_id, body, read_at, created_at')
			.eq('thread_id', tid)
			.order('created_at', { ascending: true })
			.limit(500),
		sb
			.from('profiles')
			.select('id, first_name, last_name, email')
			.eq('id', thread.employee_user_id)
			.maybeSingle(),
	]);

	return NextResponse.json({ thread, employee, messages: messages || [] });
}

type PostBody = { body?: string };

/**
 * POST — employer reply.
 */
export async function POST(
	request: NextRequest,
	ctx: { params: Promise<{ threadId: string }> },
) {
	const auth = await requireEmployer(request);
	if (auth instanceof NextResponse) return auth;
	const { threadId } = await ctx.params;
	const tid = String(threadId || '').trim();
	if (!tid) return NextResponse.json({ error: 'Invalid thread' }, { status: 400 });

	let payload: PostBody;
	try {
		payload = (await request.json()) as PostBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}
	const body = String(payload.body ?? '').trim();
	if (!body) return NextResponse.json({ error: 'body is required' }, { status: 400 });

	const sb = getSupabaseAdmin();
	const { data: thread, error } = await sb
		.from('workplace_direct_threads')
		.select('id, employee_user_id')
		.eq('id', tid)
		.eq('employer_user_id', auth.employerId)
		.maybeSingle();
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const { data: row, error: insErr } = await sb
		.from('workplace_direct_messages')
		.insert({ thread_id: tid, sender_user_id: auth.employerId, body })
		.select('*')
		.single();
	if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

	await sb.from('notifications').insert({
		user_id: thread.employee_user_id,
		title: 'New message from your employer',
		body: body.slice(0, 240),
		category: 'workplace_direct',
		link: '/patient/messages',
	});

	return NextResponse.json(row, { status: 201 });
}
