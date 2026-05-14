import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { clinicalMessagingAllowed } from '@/server/messaging/clinicalChannelEligibility';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/messages — thread summaries + recent flat rows for dashboards. */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	const flat = request.nextUrl.searchParams.get('flat') === '1';

	const sb = getSupabaseAdmin();
	const { data: rows, error } = await sb
		.from('provider_secure_messages')
		.select('*')
		.eq('provider_user_id', ctx.userId)
		.order('created_at', { ascending: false })
		.limit(400);

	if (error) {
		console.error('[api/provider/messages GET]', error.message);
		return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
	}

	const patientIds = Array.from(new Set((rows || []).map((r: { patient_user_id: string }) => r.patient_user_id)));
	const names = new Map<string, string>();
	if (patientIds.length) {
		const { data: profs } = await sb
			.from('profiles')
			.select('id, first_name, last_name, email')
			.in('id', patientIds);
		for (const p of profs || []) {
			const label =
				[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || p.id;
			names.set(p.id, label);
		}
	}

	const items = (rows || []).map((r: Record<string, unknown>) => ({
		...r,
		patient_label: names.get(String(r.patient_user_id)) || 'Patient',
	}));

	if (flat) {
		return NextResponse.json({ items, threads: [] as unknown[] });
	}

	const byPatient = new Map<
		string,
		{
			patient_user_id: string;
			patient_label: string;
			last_at: string;
			preview: string;
			unread_for_provider: number;
		}
	>();
	for (const r of rows || []) {
		const row = r as {
			patient_user_id: string;
			created_at: string;
			body: string;
			sender_user_id: string;
			read_at: string | null;
		};
		const pid = row.patient_user_id;
		const label = names.get(pid) || 'Patient';
		const cur = byPatient.get(pid);
		const isUnreadPatient =
			row.sender_user_id === pid && (row.read_at == null || row.read_at === '');
		if (!cur) {
			byPatient.set(pid, {
				patient_user_id: pid,
				patient_label: label,
				last_at: row.created_at,
				preview: String(row.body || '').slice(0, 220),
				unread_for_provider: isUnreadPatient ? 1 : 0,
			});
		} else {
			if (new Date(row.created_at) > new Date(cur.last_at)) {
				cur.last_at = row.created_at;
				cur.preview = String(row.body || '').slice(0, 220);
			}
			if (isUnreadPatient) cur.unread_for_provider += 1;
		}
	}

	const threads = Array.from(byPatient.values()).sort((a, b) => Date.parse(b.last_at) - Date.parse(a.last_at));

	return NextResponse.json({ threads, items });
}

/** POST /api/provider/messages { patient_user_id, subject?, body } */
export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const body = (await request.json().catch(() => ({}))) as {
		patient_user_id?: string;
		subject?: string;
		body?: string;
	};

	if (!body.patient_user_id || !body.body) {
		return NextResponse.json({ error: 'patient_user_id and body are required' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();

	const allowed = await clinicalMessagingAllowed(sb, ctx.userId, body.patient_user_id);
	if (!allowed) {
		return NextResponse.json(
			{ error: 'No active care channel with this patient (relationship or visit required).' },
			{ status: 403 },
		);
	}

	const { data: row, error } = await sb
		.from('provider_secure_messages')
		.insert({
			provider_user_id: ctx.userId,
			patient_user_id: body.patient_user_id,
			sender_user_id: ctx.userId,
			subject: body.subject || '',
			body: body.body,
		})
		.select('*')
		.single();

	if (error) {
		console.error('[api/provider/messages POST]', error.message);
		return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
	}

	return NextResponse.json(row);
}
