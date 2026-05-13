import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/provider/notes */
export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const body = (await request.json().catch(() => ({}))) as {
		user_id?: string;
		appointment_id?: string | null;
		note_content?: string;
	};

	const { user_id, appointment_id, note_content } = body;
	const providerId = ctx.userId;

	if (!user_id || !note_content) {
		return NextResponse.json({ error: 'Missing required fields: user_id, note_content' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();

	const { data: relationship } = await sb
		.from('patient_provider_relationships')
		.select('id')
		.eq('provider_id', providerId)
		.eq('patient_id', user_id)
		.maybeSingle();

	if (!relationship) {
		return NextResponse.json({ error: 'You do not have access to this patient' }, { status: 403 });
	}

	const { data: note, error } = await sb
		.from('clinical_notes')
		.insert({
			user_id,
			provider_id: providerId,
			appointment_id: appointment_id || null,
			note_content,
			date_created: new Date().toISOString(),
		})
		.select('id, date_created')
		.single();

	if (error) {
		console.error('[api/provider/notes]', error.message);
		return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
	}

	return NextResponse.json({ id: note.id, date_created: note.date_created });
}
