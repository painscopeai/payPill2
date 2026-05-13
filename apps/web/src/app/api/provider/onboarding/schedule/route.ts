import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { validateWeeklyHours } from '@/server/provider/scheduleSettings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_SCHEDULE = {
	timezone: 'UTC',
	slot_duration_minutes: 30,
	weekly_hours: {} as Record<string, unknown>,
};

/** GET /api/provider/onboarding/schedule */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;

	const sb = getSupabaseAdmin();
	const { data: row } = await sb
		.from('provider_schedule_settings')
		.select('timezone, slot_duration_minutes, weekly_hours')
		.eq('provider_user_id', ctx.userId)
		.maybeSingle();

	if (!row) {
		return NextResponse.json(DEFAULT_SCHEDULE);
	}

	return NextResponse.json({
		timezone: row.timezone || 'UTC',
		slot_duration_minutes: row.slot_duration_minutes ?? 30,
		weekly_hours: row.weekly_hours && typeof row.weekly_hours === 'object' ? row.weekly_hours : {},
	});
}

type ScheduleBody = {
	timezone?: unknown;
	slot_duration_minutes?: unknown;
	weekly_hours?: unknown;
};

/** PUT /api/provider/onboarding/schedule */
export async function PUT(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: ScheduleBody = {};
	try {
		body = (await request.json()) as ScheduleBody;
	} catch {
		body = {};
	}

	const tzRaw = typeof body.timezone === 'string' ? body.timezone.trim() : 'UTC';
	const timezone = tzRaw.slice(0, 120) || 'UTC';

	let slot = typeof body.slot_duration_minutes === 'number' ? body.slot_duration_minutes : 30;
	if (typeof body.slot_duration_minutes === 'string') {
		slot = parseInt(body.slot_duration_minutes, 10) || 30;
	}
	if (!Number.isFinite(slot)) slot = 30;
	slot = Math.min(120, Math.max(10, Math.floor(slot)));

	const whParsed = validateWeeklyHours(body.weekly_hours);
	if (!whParsed.ok) {
		return NextResponse.json({ error: whParsed.error }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const payload = {
		provider_user_id: ctx.userId,
		timezone,
		slot_duration_minutes: slot,
		weekly_hours: whParsed.value,
		updated_at: new Date().toISOString(),
	};

	const { data: upserted, error } = await sb
		.from('provider_schedule_settings')
		.upsert(payload, { onConflict: 'provider_user_id' })
		.select('timezone, slot_duration_minutes, weekly_hours')
		.maybeSingle();

	if (error) {
		console.error('[onboarding/schedule PUT]', error.message);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json(upserted || { timezone, slot_duration_minutes: slot, weekly_hours: whParsed.value });
}
