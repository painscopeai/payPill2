import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import {
	buildSlotSuggestions,
	getDayKeyForYmdInTimeZone,
	intervalsToMinuteRanges,
	validateWeeklyHours,
} from '@/server/provider/scheduleSettings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/calendar/smart?date=YYYY-MM-DD&duration_minutes=30 */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const date = String(url.searchParams.get('date') || '').trim();
	const rawDur = url.searchParams.get('duration_minutes');

	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return NextResponse.json({ error: 'Query param date (YYYY-MM-DD) is required' }, { status: 400 });
	}

	if (!ctx.providerOrgId) {
		return NextResponse.json({
			date,
			duration_minutes: 30,
			suggestions: [],
			booked_count: 0,
			message: 'Link your practice to load calendar availability.',
		});
	}

	const sb = getSupabaseAdmin();

	const { data: sched } = await sb
		.from('provider_schedule_settings')
		.select('timezone, slot_duration_minutes, weekly_hours')
		.eq('provider_user_id', ctx.userId)
		.maybeSingle();

	let duration =
		rawDur != null && String(rawDur).trim() !== ''
			? parseInt(String(rawDur), 10)
			: Number((sched as { slot_duration_minutes?: number } | null)?.slot_duration_minutes) || 30;
	if (!Number.isFinite(duration)) duration = 30;
	duration = Math.min(120, Math.max(10, duration));

	const tz = String((sched as { timezone?: string } | null)?.timezone || 'UTC').trim() || 'UTC';
	const weeklyRaw = (sched as { weekly_hours?: unknown } | null)?.weekly_hours ?? {};
	const weeklyParsed = validateWeeklyHours(weeklyRaw);
	const weekly = weeklyParsed.ok ? weeklyParsed.value : {};

	const dayKey = getDayKeyForYmdInTimeZone(date, tz);
	let ranges = intervalsToMinuteRanges(dayKey, weekly);
	if (!ranges.length) {
		ranges = [{ start: 9 * 60, end: 17 * 60 }];
	}

	let aptRes = await sb
		.from('appointments')
		.select('id, appointment_time, status')
		.eq('provider_id', ctx.providerOrgId)
		.eq('appointment_date', date);

	if (aptRes.error) {
		console.warn(
			'[api/provider/calendar/smart] appointments primary select failed, retrying minimal',
			aptRes.error.message,
		);
		aptRes = await sb
			.from('appointments')
			.select('id, appointment_time')
			.eq('provider_id', ctx.providerOrgId)
			.eq('appointment_date', date);
	}

	if (aptRes.error) {
		console.error('[api/provider/calendar/smart]', aptRes.error.message);
		return NextResponse.json({ error: 'Failed to load calendar' }, { status: 500 });
	}

	const appointments = aptRes.data || [];

	const bookedSlots: { start: number; end: number }[] = [];
	let bookedCount = 0;
	for (const apt of appointments) {
		const st = String((apt as { status?: string | null }).status || 'scheduled').toLowerCase();
		if (st === 'cancelled') continue;
		bookedCount += 1;
		const t = String((apt as { appointment_time?: string }).appointment_time || '09:00');
		const [h, m] = t.split(':').map((x) => parseInt(x, 10));
		const startMinutes = (h || 0) * 60 + (m || 0);
		const dur = duration;
		bookedSlots.push({ start: startMinutes, end: startMinutes + dur });
	}

	const suggestions = buildSlotSuggestions(ranges, duration, bookedSlots, 15);

	return NextResponse.json({
		date,
		duration_minutes: duration,
		suggestions,
		booked_count: bookedCount,
	});
}
