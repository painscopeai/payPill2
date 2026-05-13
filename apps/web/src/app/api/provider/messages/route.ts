import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/messages — provider–patient secure messages. */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;

	const sb = getSupabaseAdmin();
	const { data: rows, error } = await sb
		.from('provider_secure_messages')
		.select('*')
		.eq('provider_user_id', ctx.userId)
		.order('created_at', { ascending: false })
		.limit(200);

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

	return NextResponse.json({ items });
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

	const { data: relationship } = await sb
		.from('patient_provider_relationships')
		.select('id')
		.eq('provider_id', ctx.userId)
		.eq('patient_id', body.patient_user_id)
		.maybeSingle();

	if (!relationship) {
		return NextResponse.json({ error: 'No care relationship with this patient' }, { status: 403 });
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
