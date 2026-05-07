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

	const { data: recipients, error } = await sb
		.from('employer_broadcast_recipients')
		.select('id, broadcast_id, employer_id, read_at, created_at')
		.eq('patient_user_id', uid)
		.order('created_at', { ascending: false })
		.limit(200);
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	if (!recipients || recipients.length === 0) {
		return NextResponse.json({ items: [] });
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

	return NextResponse.json({ items });
}
