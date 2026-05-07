import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireEmployer } from '@/server/auth/requireEmployer';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ComposeBody = {
	subject?: string;
	body?: string;
	audience?: 'all' | 'department' | 'specific' | 'custom';
	department?: string | null;
	patient_user_ids?: string[];
	specific_employee_ids?: string[];
};

/**
 * GET /api/employer/broadcasts
 *
 * List broadcasts the employer composed, with reply counts and recipient counts.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;

	const sb = getSupabaseAdmin();
	const { data: broadcasts, error } = await sb
		.from('employer_broadcasts')
		.select('id, subject, body, audience, created_at, updated_at')
		.eq('employer_id', ctx.employerId)
		.order('created_at', { ascending: false })
		.limit(200);
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	const ids = (broadcasts || []).map((b: { id: string }) => b.id);
	let recipientStats = new Map<string, { total: number; read: number }>();
	let replyStats = new Map<string, { total: number; unread: number }>();

	if (ids.length > 0) {
		const [{ data: recRows }, { data: repRows }] = await Promise.all([
			sb
				.from('employer_broadcast_recipients')
				.select('broadcast_id, read_at')
				.in('broadcast_id', ids),
			sb
				.from('employer_broadcast_replies')
				.select('broadcast_id, sender_role, read_at')
				.in('broadcast_id', ids),
		]);

		recipientStats = new Map();
		(recRows || []).forEach((r: { broadcast_id: string; read_at: string | null }) => {
			const cur = recipientStats.get(r.broadcast_id) || { total: 0, read: 0 };
			cur.total += 1;
			if (r.read_at) cur.read += 1;
			recipientStats.set(r.broadcast_id, cur);
		});

		replyStats = new Map();
		(repRows || []).forEach((r: { broadcast_id: string; sender_role: string; read_at: string | null }) => {
			const cur = replyStats.get(r.broadcast_id) || { total: 0, unread: 0 };
			cur.total += 1;
			if (r.sender_role === 'patient' && !r.read_at) cur.unread += 1;
			replyStats.set(r.broadcast_id, cur);
		});
	}

	const items = (broadcasts || []).map((b: { id: string }) => ({
		...b,
		recipient_count: recipientStats.get(b.id)?.total || 0,
		read_count: recipientStats.get(b.id)?.read || 0,
		reply_count: replyStats.get(b.id)?.total || 0,
		unread_replies: replyStats.get(b.id)?.unread || 0,
	}));

	return NextResponse.json({ items });
}

/**
 * POST /api/employer/broadcasts
 *
 * Compose a broadcast and fan out to selected employees. Audience modes:
 *   - 'all'        → every active employer_employees user_id
 *   - 'department' → filter by department
 *   - 'custom'     → explicit patient_user_ids (must belong to this employer)
 */
export async function POST(request: NextRequest) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: ComposeBody;
	try {
		body = (await request.json()) as ComposeBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const subject = String(body.subject ?? '').trim();
	const text = String(body.body ?? '').trim();
	const audience = body.audience || 'all';

	if (!subject) return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
	if (!text) return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
	if (!['all', 'department', 'custom', 'specific'].includes(audience)) {
		return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();

	let q = sb
		.from('employer_employees')
		.select('user_id, status, department')
		.eq('employer_id', ctx.employerId)
		.eq('status', 'active')
		.not('user_id', 'is', null);

	if (audience === 'department') {
		const dep = String(body.department ?? '').trim();
		if (!dep) return NextResponse.json({ error: 'Department is required' }, { status: 400 });
		q = q.eq('department', dep);
	}
	const { data: rosterRows, error: rosterErr } = await q;
	if (rosterErr) return NextResponse.json({ error: rosterErr.message }, { status: 500 });

	let recipientIds: string[] = (rosterRows || [])
		.map((r: { user_id: string | null }) => r.user_id)
		.filter((u: string | null): u is string => !!u);

	if (audience === 'custom' || audience === 'specific') {
		const requested = [
			...(Array.isArray(body.patient_user_ids) ? body.patient_user_ids : []),
			...(Array.isArray(body.specific_employee_ids) ? body.specific_employee_ids : []),
		]
			.map((s) => String(s).trim())
			.filter(Boolean);
		const allowed = new Set(recipientIds);
		recipientIds = requested.filter((id) => allowed.has(id));
		if (recipientIds.length === 0) {
			return NextResponse.json(
				{ error: 'No valid recipients in your roster (active only)' },
				{ status: 400 },
			);
		}
	}

	if (recipientIds.length === 0) {
		return NextResponse.json({ error: 'No active recipients found' }, { status: 400 });
	}

	const { data: broadcast, error: bErr } = await sb
		.from('employer_broadcasts')
		.insert({
			employer_id: ctx.employerId,
			subject,
			body: text,
			audience: audience === 'specific' ? 'custom' : audience,
		})
		.select('id, subject, body, audience, created_at')
		.maybeSingle();
	if (bErr || !broadcast) {
		return NextResponse.json(
			{ error: bErr?.message || 'Failed to save broadcast' },
			{ status: 500 },
		);
	}

	const recipients = recipientIds.map((uid) => ({
		broadcast_id: broadcast.id,
		employer_id: ctx.employerId,
		patient_user_id: uid,
	}));
	const { error: recErr } = await sb.from('employer_broadcast_recipients').insert(recipients);
	if (recErr) {
		await sb.from('employer_broadcasts').delete().eq('id', broadcast.id);
		return NextResponse.json({ error: recErr.message }, { status: 500 });
	}

	const notes = recipientIds.map((uid) => ({
		user_id: uid,
		title: `New message: ${subject.slice(0, 80)}`,
		body: text.slice(0, 240),
		category: 'employer_broadcast',
		link: '/patient/messages',
	}));
	const { error: notifErr } = await sb.from('notifications').insert(notes);
	if (notifErr) {
		console.warn('[employer/broadcasts POST] notification insert failed:', notifErr.message);
	}

	return NextResponse.json(
		{ broadcast, recipientCount: recipientIds.length },
		{ status: 201 },
	);
}
