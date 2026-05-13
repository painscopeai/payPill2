import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/calendar/templates — POST create template */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('appointment_templates')
		.select('*')
		.eq('provider_user_id', ctx.userId)
		.order('created_at', { ascending: false });

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const body = (await request.json().catch(() => ({}))) as {
		name?: string;
		duration_minutes?: number;
		appointment_type?: string;
		notes?: string;
	};

	if (!body.name) {
		return NextResponse.json({ error: 'name is required' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('appointment_templates')
		.insert({
			provider_user_id: ctx.userId,
			name: body.name,
			duration_minutes: body.duration_minutes ?? 30,
			appointment_type: body.appointment_type || null,
			notes: body.notes || null,
		})
		.select('*')
		.single();

	if (error) {
		console.error('[api/provider/calendar/templates POST]', error.message);
		return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
	}
	return NextResponse.json(data);
}
