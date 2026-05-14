import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { clinicalMessagingAllowed } from '@/server/messaging/clinicalChannelEligibility';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — full thread with one patient; marks patient-sent messages read.
 */
export async function GET(
	request: NextRequest,
	ctx: { params: Promise<{ patientUserId: string }> },
) {
	void request;
	const auth = await requireProvider(request);
	if (auth instanceof NextResponse) return auth;
	const { patientUserId } = await ctx.params;
	const pid = String(patientUserId || '').trim();
	if (!pid) return NextResponse.json({ error: 'Invalid patient' }, { status: 400 });

	const sb = getSupabaseAdmin();
	const ok = await clinicalMessagingAllowed(sb, auth.userId, pid);
	if (!ok) return NextResponse.json({ error: 'No messaging channel with this patient' }, { status: 403 });

	const nowIso = new Date().toISOString();
	await sb
		.from('provider_secure_messages')
		.update({ read_at: nowIso })
		.eq('provider_user_id', auth.userId)
		.eq('patient_user_id', pid)
		.eq('sender_user_id', pid)
		.is('read_at', null);

	const [{ data: messages }, { data: patient }] = await Promise.all([
		sb
			.from('provider_secure_messages')
			.select('*')
			.eq('provider_user_id', auth.userId)
			.eq('patient_user_id', pid)
			.order('created_at', { ascending: true })
			.limit(500),
		sb.from('profiles').select('id, first_name, last_name, email').eq('id', pid).maybeSingle(),
	]);

	const label =
		[patient?.first_name, patient?.last_name].filter(Boolean).join(' ').trim() || patient?.email || 'Patient';

	return NextResponse.json({
		patient_user_id: pid,
		patient_label: label,
		messages: messages || [],
	});
}
