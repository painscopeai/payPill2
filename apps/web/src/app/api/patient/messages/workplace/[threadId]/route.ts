import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { blockWalkInEmployerMessaging } from '@/server/patient/walkInPatientMessaging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadThreadForEmployee(sb: ReturnType<typeof getSupabaseAdmin>, uid: string, threadId: string) {
	const { data: thread, error } = await sb
		.from('workplace_direct_threads')
		.select('id, employer_user_id, employee_user_id, created_at, updated_at')
		.eq('id', threadId)
		.eq('employee_user_id', uid)
		.maybeSingle();
	return { thread, error };
}

/**
 * GET — workplace DM; marks employer-sent messages read.
 */
export async function GET(
	request: NextRequest,
	ctx: { params: Promise<{ threadId: string }> },
) {
	void request;
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const { threadId } = await ctx.params;
	const tid = String(threadId || '').trim();
	if (!tid) return NextResponse.json({ error: 'Invalid thread' }, { status: 400 });

	const sb = getSupabaseAdmin();
	const walkInBlockGet = await blockWalkInEmployerMessaging(sb, uid);
	if (walkInBlockGet) return walkInBlockGet;

	const { thread, error } = await loadThreadForEmployee(sb, uid, tid);
	if (error && !/does not exist|schema cache/i.test(error.message)) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
	if (error && /does not exist|schema cache/i.test(error.message)) {
		return NextResponse.json({ error: 'Workplace messaging not available' }, { status: 503 });
	}
	if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const nowIso = new Date().toISOString();
	await sb
		.from('workplace_direct_messages')
		.update({ read_at: nowIso })
		.eq('thread_id', tid)
		.neq('sender_user_id', uid)
		.is('read_at', null);

	const [{ data: messages }, { data: employer }] = await Promise.all([
		sb
			.from('workplace_direct_messages')
			.select('id, sender_user_id, body, read_at, created_at')
			.eq('thread_id', tid)
			.order('created_at', { ascending: true })
			.limit(500),
		sb.from('profiles').select('id, company_name, name, email').eq('id', thread.employer_user_id).maybeSingle(),
	]);

	return NextResponse.json({
		thread,
		employer,
		messages: messages || [],
	});
}

type PostBody = { body?: string };

/**
 * POST — employee reply in workplace thread.
 */
export async function POST(
	request: NextRequest,
	ctx: { params: Promise<{ threadId: string }> },
) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
	const walkInBlockPost = await blockWalkInEmployerMessaging(sb, uid);
	if (walkInBlockPost) return walkInBlockPost;

	const { thread, error } = await loadThreadForEmployee(sb, uid, tid);
	if (error && !/does not exist|schema cache/i.test(error.message)) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
	if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const { data: row, error: insErr } = await sb
		.from('workplace_direct_messages')
		.insert({ thread_id: tid, sender_user_id: uid, body })
		.select('*')
		.single();
	if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

	await sb.from('notifications').insert({
		user_id: thread.employer_user_id,
		title: 'New message from employee',
		body: body.slice(0, 240),
		category: 'workplace_direct',
		link: '/employer/messaging',
	});

	return NextResponse.json(row, { status: 201 });
}
