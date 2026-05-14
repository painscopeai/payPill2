import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import {
	buildSlotGridWithAvailability,
	getDayKeyForYmdInTimeZone,
	intervalsToMinuteRanges,
	validateWeeklyHours,
	weeklyHoursSummaryLines,
} from '@/server/provider/scheduleSettings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProviderScheduleRow = {
	timezone: string;
	slot_duration_minutes: number;
	weekly_hours: unknown;
};

/**
 * GET /api/patient/booking/slots?providerId=&date=YYYY-MM-DD&duration_minutes=
 * Slot grid for the selected date from provider weekly hours + existing appointments (patient booking UI).
 */
export async function GET(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const url = new URL(request.url);
	const providerId = String(url.searchParams.get('providerId') || '').trim();
	const date = String(url.searchParams.get('date') || '').trim();
	const rawDur = url.searchParams.get('duration_minutes');

	if (!providerId) {
		return NextResponse.json({ error: 'Query param providerId is required' }, { status: 400 });
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return NextResponse.json({ error: 'Query param date (YYYY-MM-DD) is required' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();

	const { count: linkCount, error: linkErr } = await sb
		.from('profiles')
		.select('id', { count: 'exact', head: true })
		.eq('role', 'provider')
		.eq('provider_org_id', providerId)
		.eq('provider_onboarding_completed', true);
	if (linkErr) {
		console.error('[patient/booking/slots] link check', linkErr.message);
		return NextResponse.json({ error: 'Could not validate provider' }, { status: 500 });
	}
	if (!linkCount || linkCount < 1) {
		return NextResponse.json({ error: 'Provider is not available for booking' }, { status: 400 });
	}

	const { data: team } = await sb
		.from('profiles')
		.select('id')
		.eq('role', 'provider')
		.eq('provider_org_id', providerId)
		.eq('provider_onboarding_completed', true)
		.order('updated_at', { ascending: false })
		.limit(20);

	const teamIds = ((team || []) as { id: string }[]).map((r) => r.id).filter(Boolean);
	let schedRow: ProviderScheduleRow | null = null;

	for (const tid of teamIds) {
		const { data: row } = await sb
			.from('provider_schedule_settings')
			.select('timezone, slot_duration_minutes, weekly_hours')
			.eq('provider_user_id', tid)
			.maybeSingle();
		if (row) {
			schedRow = row as ProviderScheduleRow;
			break;
		}
	}

	let duration =
		rawDur != null && String(rawDur).trim() !== ''
			? parseInt(String(rawDur), 10)
			: Number(schedRow?.slot_duration_minutes) || 30;
	if (!Number.isFinite(duration)) duration = 30;
	duration = Math.min(120, Math.max(10, duration));

	const tz = String(schedRow?.timezone || 'UTC').trim() || 'UTC';
	const weeklyParsed = validateWeeklyHours(schedRow?.weekly_hours ?? {});
	const weekly = weeklyParsed.ok ? weeklyParsed.value : {};
	const dayKey = getDayKeyForYmdInTimeZone(date, tz);
	let ranges = intervalsToMinuteRanges(dayKey, weekly);
	if (!ranges.length) {
		ranges = [{ start: 9 * 60, end: 17 * 60 }];
	}

	// Avoid selecting columns some DBs never migrated (e.g. duration_minutes); use grid duration for overlap math.
	let aptRes = await sb
		.from('appointments')
		.select('id, appointment_time, status')
		.eq('provider_id', providerId)
		.eq('appointment_date', date);

	if (aptRes.error) {
		console.warn('[patient/booking/slots] appointments primary select failed, retrying minimal', aptRes.error.message);
		aptRes = await sb
			.from('appointments')
			.select('id, appointment_time')
			.eq('provider_id', providerId)
			.eq('appointment_date', date);
	}

	if (aptRes.error) {
		console.error('[patient/booking/slots] appointments', aptRes.error.message);
		return NextResponse.json(
			{ error: 'Failed to load appointments', detail: aptRes.error.message },
			{ status: 500 },
		);
	}

	const appointments = aptRes.data || [];

	const bookedSlots: { start: number; end: number }[] = [];
	for (const apt of appointments) {
		const st = String((apt as { status?: string | null }).status || 'scheduled').toLowerCase();
		if (st === 'cancelled') continue;
		const t = String((apt as { appointment_time?: string }).appointment_time || '09:00');
		const [h, m] = t.split(':').map((x) => parseInt(x, 10));
		const startMinutes = (h || 0) * 60 + (m || 0);
		const dur = duration;
		bookedSlots.push({ start: startMinutes, end: startMinutes + dur });
	}

	const slots = buildSlotGridWithAvailability(ranges, duration, bookedSlots, 15);
	const weeklySummary = weeklyHoursSummaryLines(weekly);

	let bookedCount = 0;
	for (const apt of appointments || []) {
		const st = String((apt as { status?: string | null }).status || 'scheduled').toLowerCase();
		if (st !== 'cancelled') bookedCount += 1;
	}

	return NextResponse.json({
		date,
		provider_id: providerId,
		duration_minutes: duration,
		timezone: tz,
		weekday_key: dayKey,
		weekly_summary: weeklySummary,
		booked_count: bookedCount,
		slots,
		available_times: slots.filter((s) => s.available).map((s) => s.time),
	});
}
