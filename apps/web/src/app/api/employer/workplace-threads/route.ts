import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireEmployer } from '@/server/auth/requireEmployer';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — list workplace DM threads for this employer.
 */
export async function GET(request: NextRequest) {
	void request;
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;

	const sb = getSupabaseAdmin();
	const { data: threads, error } = await sb
		.from('workplace_direct_threads')
		.select('id, employer_user_id, employee_user_id, created_at, updated_at')
		.eq('employer_user_id', ctx.employerId)
		.order('updated_at', { ascending: false })
		.limit(200);

	if (error) {
		if (/does not exist|schema cache/i.test(error.message)) {
			return NextResponse.json({ items: [] });
		}
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const empIds = Array.from(new Set((threads || []).map((t: { employee_user_id: string }) => t.employee_user_id)));
	let profBy = new Map<string, { first_name: string | null; last_name: string | null; email: string | null }>();
	if (empIds.length) {
		const { data: profs } = await sb
			.from('profiles')
			.select('id, first_name, last_name, email')
			.in('id', empIds);
		profBy = new Map((profs || []).map((p: { id: string }) => [p.id, p as never]));
	}

	const threadIds = (threads || []).map((t: { id: string }) => t.id);
	let wMsgs: { thread_id: string; sender_user_id: string; body: string; read_at: string | null; created_at: string }[] =
		[];
	if (threadIds.length) {
		const { data: msgs } = await sb
			.from('workplace_direct_messages')
			.select('thread_id, sender_user_id, body, read_at, created_at')
			.in('thread_id', threadIds)
			.order('created_at', { ascending: false })
			.limit(1200);
		wMsgs = (msgs || []) as typeof wMsgs;
	}

	const lastBy = new Map<string, { body: string; created_at: string }>();
	const unreadBy = new Map<string, number>();
	for (const m of wMsgs) {
		if (!lastBy.has(m.thread_id)) {
			lastBy.set(m.thread_id, { body: m.body, created_at: m.created_at });
		}
		if (m.sender_user_id !== ctx.employerId && !m.read_at) {
			unreadBy.set(m.thread_id, (unreadBy.get(m.thread_id) || 0) + 1);
		}
	}

	const items = (threads || []).map((t: { id: string; employee_user_id: string; updated_at: string; created_at: string }) => {
		const p = profBy.get(t.employee_user_id);
		const label =
			[p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() || p?.email || t.employee_user_id;
		const last = lastBy.get(t.id);
		return {
			id: t.id,
			employee_user_id: t.employee_user_id,
			employee_label: label,
			preview: last?.body?.slice(0, 200) || '',
			last_at: last?.created_at || t.updated_at || t.created_at,
			unread: unreadBy.get(t.id) || 0,
		};
	});

	return NextResponse.json({ items });
}

type PostBody = { employee_user_id?: string; body?: string };

/**
 * POST — employer starts or continues a DM with a rostered employee.
 */
export async function POST(request: NextRequest) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;

	let payload: PostBody;
	try {
		payload = (await request.json()) as PostBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}
	const employeeUserId = String(payload.employee_user_id ?? '').trim();
	const body = String(payload.body ?? '').trim();
	if (!employeeUserId) return NextResponse.json({ error: 'employee_user_id is required' }, { status: 400 });
	if (!body) return NextResponse.json({ error: 'body is required' }, { status: 400 });

	const sb = getSupabaseAdmin();
	const { data: roster, error: rErr } = await sb
		.from('employer_employees')
		.select('id')
		.eq('employer_id', ctx.employerId)
		.eq('user_id', employeeUserId)
		.eq('status', 'active')
		.maybeSingle();
	if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
	if (!roster) return NextResponse.json({ error: 'Employee not on your active roster' }, { status: 403 });

	let threadId: string;
	const { data: existing } = await sb
		.from('workplace_direct_threads')
		.select('id')
		.eq('employer_user_id', ctx.employerId)
		.eq('employee_user_id', employeeUserId)
		.maybeSingle();
	if (existing?.id) threadId = existing.id as string;
	else {
		const { data: ins, error: cErr } = await sb
			.from('workplace_direct_threads')
			.insert({ employer_user_id: ctx.employerId, employee_user_id: employeeUserId })
			.select('id')
			.single();
		if (cErr || !ins) return NextResponse.json({ error: cErr?.message || 'Failed to create thread' }, { status: 500 });
		threadId = (ins as { id: string }).id;
	}

	const { error: mErr } = await sb.from('workplace_direct_messages').insert({
		thread_id: threadId,
		sender_user_id: ctx.employerId,
		body,
	});
	if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

	await sb.from('notifications').insert({
		user_id: employeeUserId,
		title: 'New message from your employer',
		body: body.slice(0, 240),
		category: 'workplace_direct',
		link: '/patient/messages',
	});

	return NextResponse.json({ thread_id: threadId }, { status: 201 });
}
