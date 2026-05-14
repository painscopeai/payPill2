import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { clinicalMessagingAllowed } from '@/server/messaging/clinicalChannelEligibility';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — messages with a provider; marks provider-sent rows read for this patient.
 */
export async function GET(
	request: NextRequest,
	ctx: { params: Promise<{ providerUserId: string }> },
) {
	void request;
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const { providerUserId } = await ctx.params;
	const pid = String(providerUserId || '').trim();
	if (!pid) return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });

	const sb = getSupabaseAdmin();
	const ok = await clinicalMessagingAllowed(sb, pid, uid);
	if (!ok) return NextResponse.json({ error: 'No messaging channel with this provider' }, { status: 403 });

	const nowIso = new Date().toISOString();
	await sb
		.from('provider_secure_messages')
		.update({ read_at: nowIso })
		.eq('patient_user_id', uid)
		.eq('provider_user_id', pid)
		.eq('sender_user_id', pid)
		.is('read_at', null);

	const [{ data: rows }, { data: prof }] = await Promise.all([
		sb
			.from('provider_secure_messages')
			.select('id, sender_user_id, body, read_at, created_at, subject')
			.eq('patient_user_id', uid)
			.eq('provider_user_id', pid)
			.order('created_at', { ascending: true })
			.limit(500),
		sb.from('profiles').select('id, first_name, last_name, email').eq('id', pid).maybeSingle(),
	]);

	const label =
		[prof?.first_name, prof?.last_name].filter(Boolean).join(' ').trim() || prof?.email || 'Care team';

	return NextResponse.json({
		provider_user_id: pid,
		provider_label: label,
		messages: rows || [],
	});
}

type PostBody = { body?: string; subject?: string };

/**
 * POST — patient sends a message to the provider.
 */
export async function POST(
	request: NextRequest,
	ctx: { params: Promise<{ providerUserId: string }> },
) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const { providerUserId } = await ctx.params;
	const pid = String(providerUserId || '').trim();
	if (!pid) return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });

	let payload: PostBody;
	try {
		payload = (await request.json()) as PostBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}
	const body = String(payload.body ?? '').trim();
	const subject = String(payload.subject ?? '').trim();
	if (!body) return NextResponse.json({ error: 'body is required' }, { status: 400 });

	const sb = getSupabaseAdmin();
	const ok = await clinicalMessagingAllowed(sb, pid, uid);
	if (!ok) return NextResponse.json({ error: 'No messaging channel with this provider' }, { status: 403 });

	const { data: row, error } = await sb
		.from('provider_secure_messages')
		.insert({
			provider_user_id: pid,
			patient_user_id: uid,
			sender_user_id: uid,
			subject: subject || '',
			body,
		})
		.select('*')
		.single();
	if (error) {
		console.error('[patient clinical POST]', error.message);
		return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
	}

	await sb.from('notifications').insert({
		user_id: pid,
		title: 'New message from a patient',
		body: body.slice(0, 240),
		category: 'patient_provider_message',
		link: '/provider/messaging',
	});

	return NextResponse.json(row, { status: 201 });
}
