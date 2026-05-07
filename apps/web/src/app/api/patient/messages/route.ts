import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/patient/messages - patient's inbox of broadcasts (with read state, latest body).
 */
export async function GET(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const sb = getSupabaseAdmin();

	const [{ data: recipients, error }, { data: memberships }] = await Promise.all([
		sb
		.from('employer_broadcast_recipients')
		.select('id, broadcast_id, employer_id, read_at, created_at')
		.eq('patient_user_id', uid)
		.order('created_at', { ascending: false })
		.limit(200),
		sb
			.from('employer_employees')
			.select('employer_id')
			.eq('user_id', uid)
			.eq('status', 'active'),
	]);
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	const employerIdsFromMembership = Array.from(
		new Set((memberships || []).map((m: { employer_id: string | null }) => m.employer_id).filter(Boolean)),
	) as string[];
	let employerOptions: Array<{ employer_id: string; employer_label: string }> = [];
	if (employerIdsFromMembership.length > 0) {
		const { data: employerProfiles } = await sb
			.from('profiles')
			.select('id,company_name,name,email')
			.in('id', employerIdsFromMembership);
		employerOptions = (employerProfiles || []).map(
			(p: { id: string; company_name: string | null; name: string | null; email: string | null }) => ({
				employer_id: p.id,
				employer_label: p.company_name || p.name || p.email || p.id,
			}),
		);
	}

	if (!recipients || recipients.length === 0) {
		return NextResponse.json({ items: [], employers: employerOptions });
	}

	const broadcastIds = Array.from(new Set(recipients.map((r: { broadcast_id: string }) => r.broadcast_id)));
	const employerIds = Array.from(new Set(recipients.map((r: { employer_id: string }) => r.employer_id)));

	const [{ data: broadcasts }, { data: employers }, { data: latestReplies }] = await Promise.all([
		sb
			.from('employer_broadcasts')
			.select('id, subject, body, created_at, employer_id')
			.in('id', broadcastIds),
		sb
			.from('profiles')
			.select('id, company_name, name, email')
			.in('id', employerIds),
		sb
			.from('employer_broadcast_replies')
			.select('recipient_id, sender_role, body, created_at, read_at')
			.in('recipient_id', recipients.map((r: { id: string }) => r.id))
			.order('created_at', { ascending: false }),
	]);

	const broadcastById = new Map((broadcasts || []).map((b: { id: string }) => [b.id, b as never]));
	const employerById = new Map((employers || []).map((e: { id: string }) => [e.id, e as never]));

	const lastByRecipient = new Map<string, { body: string; created_at: string; sender_role: string }>();
	const unreadFromEmployerByRecipient = new Map<string, number>();
	(latestReplies || []).forEach((r: { recipient_id: string; sender_role: string; body: string; created_at: string; read_at: string | null }) => {
		if (!lastByRecipient.has(r.recipient_id)) {
			lastByRecipient.set(r.recipient_id, { body: r.body, created_at: r.created_at, sender_role: r.sender_role });
		}
		if (r.sender_role === 'employer' && !r.read_at) {
			unreadFromEmployerByRecipient.set(
				r.recipient_id,
				(unreadFromEmployerByRecipient.get(r.recipient_id) || 0) + 1,
			);
		}
	});

	const items = recipients.map((r: { id: string; broadcast_id: string; employer_id: string; read_at: string | null; created_at: string }) => {
		const b = broadcastById.get(r.broadcast_id) as { subject: string; body: string; created_at: string } | undefined;
		const e = employerById.get(r.employer_id) as { company_name: string | null; name: string | null; email: string | null } | undefined;
		const last = lastByRecipient.get(r.id);
		return {
			recipient_id: r.id,
			broadcast_id: r.broadcast_id,
			employer_id: r.employer_id,
			employer_label: e?.company_name || e?.name || e?.email || r.employer_id,
			subject: b?.subject || '(no subject)',
			preview: last?.body?.slice(0, 200) || b?.body?.slice(0, 200) || '',
			last_at: last?.created_at || b?.created_at || r.created_at,
			read_at: r.read_at,
			unread_from_employer: unreadFromEmployerByRecipient.get(r.id) || 0,
		};
	});

	return NextResponse.json({ items, employers: employerOptions });
}

type ComposePatientMessageBody = {
	employer_id?: string;
	subject?: string;
	body?: string;
};

/**
 * POST /api/patient/messages
 *
 * Patient starts a new direct thread to an employer they belong to.
 * Implemented on top of existing broadcast thread tables to keep a single conversation surface.
 */
export async function POST(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	let payload: ComposePatientMessageBody;
	try {
		payload = (await request.json()) as ComposePatientMessageBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const employerId = String(payload.employer_id ?? '').trim();
	const subject = String(payload.subject ?? '').trim() || 'Message from employee';
	const body = String(payload.body ?? '').trim();
	if (!employerId) return NextResponse.json({ error: 'employer_id is required' }, { status: 400 });
	if (!body) return NextResponse.json({ error: 'Message body is required' }, { status: 400 });

	const sb = getSupabaseAdmin();

	const { data: membership, error: mErr } = await sb
		.from('employer_employees')
		.select('id')
		.eq('user_id', uid)
		.eq('employer_id', employerId)
		.eq('status', 'active')
		.limit(1)
		.maybeSingle();
	if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
	if (!membership) {
		return NextResponse.json({ error: 'You are not an active employee of this employer' }, { status: 403 });
	}

	const { data: broadcast, error: bErr } = await sb
		.from('employer_broadcasts')
		.insert({
			employer_id: employerId,
			subject,
			body,
			audience: 'custom',
		})
		.select('id')
		.maybeSingle();
	if (bErr || !broadcast) {
		return NextResponse.json({ error: bErr?.message || 'Failed to create thread' }, { status: 500 });
	}

	const { data: recipient, error: rErr } = await sb
		.from('employer_broadcast_recipients')
		.insert({
			broadcast_id: broadcast.id,
			employer_id: employerId,
			patient_user_id: uid,
			read_at: new Date().toISOString(),
		})
		.select('id')
		.maybeSingle();
	if (rErr || !recipient) {
		await sb.from('employer_broadcasts').delete().eq('id', broadcast.id);
		return NextResponse.json({ error: rErr?.message || 'Failed to create recipient' }, { status: 500 });
	}

	const { error: replyErr } = await sb.from('employer_broadcast_replies').insert({
		broadcast_id: broadcast.id,
		recipient_id: recipient.id,
		employer_id: employerId,
		patient_user_id: uid,
		sender_user_id: uid,
		sender_role: 'patient',
		body,
	});
	if (replyErr) {
		await sb.from('employer_broadcast_recipients').delete().eq('id', recipient.id);
		await sb.from('employer_broadcasts').delete().eq('id', broadcast.id);
		return NextResponse.json({ error: replyErr.message }, { status: 500 });
	}

	await sb.from('notifications').insert({
		user_id: employerId,
		title: 'New message from employee',
		body: body.slice(0, 240),
		category: 'patient_direct_message',
		link: '/employer/messaging',
	});

	return NextResponse.json({ recipient_id: recipient.id, broadcast_id: broadcast.id }, { status: 201 });
}
