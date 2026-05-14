import type { SupabaseClient } from '@supabase/supabase-js';
import {
	buildSlotGridWithAvailability,
	formatYmdInTimeZone,
	getDayKeyForYmdInTimeZone,
	getWallClockMinutesFromMidnightInTimeZone,
	intervalsToMinuteRanges,
	type SlotGridEntry,
	validateWeeklyHours,
	weeklyHoursSummaryLines,
} from '@/server/provider/scheduleSettings';

type ProviderScheduleRow = {
	timezone: string;
	slot_duration_minutes: number;
	weekly_hours: unknown;
};

export type PatientBookingSlotsOk = {
	ok: true;
	date: string;
	provider_id: string;
	duration_minutes: number;
	timezone: string;
	weekday_key: string;
	weekly_summary: string[];
	booked_count: number;
	slots: SlotGridEntry[];
	available_times: string[];
};

export type PatientBookingSlotsErr = {
	ok: false;
	status: number;
	error: string;
	detail?: string;
};

/**
 * Slot grid for patient booking: provider weekly hours, existing appointments,
 * and (for "today" in the provider timezone) times that are already past the clock.
 */
export async function getPatientBookingSlotsForDate(
	sb: SupabaseClient,
	providerId: string,
	date: string,
	opts?: { now?: Date; durationMinutesOverride?: number },
): Promise<PatientBookingSlotsOk | PatientBookingSlotsErr> {
	const { count: linkCount, error: linkErr } = await sb
		.from('profiles')
		.select('id', { count: 'exact', head: true })
		.eq('role', 'provider')
		.eq('provider_org_id', providerId)
		.eq('provider_onboarding_completed', true);
	if (linkErr) {
		console.error('[patientBookingDaySlots] link check', linkErr.message);
		return { ok: false, status: 500, error: 'Could not validate provider' };
	}
	if (!linkCount || linkCount < 1) {
		return { ok: false, status: 400, error: 'Provider is not available for booking' };
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

	const rawDur = opts?.durationMinutesOverride;
	let duration =
		rawDur != null && Number.isFinite(rawDur)
			? Number(rawDur)
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

	type AptRow = { appointment_time?: string | null; status?: string | null };

	const primaryApt = await sb
		.from('appointments')
		.select('id, appointment_time, status')
		.eq('provider_id', providerId)
		.eq('appointment_date', date);

	let appointments: AptRow[] = [];

	if (primaryApt.error) {
		console.warn(
			'[patientBookingDaySlots] appointments primary select failed, retrying minimal',
			primaryApt.error.message,
		);
		const minimalApt = await sb
			.from('appointments')
			.select('id, appointment_time')
			.eq('provider_id', providerId)
			.eq('appointment_date', date);
		if (minimalApt.error) {
			console.error('[patientBookingDaySlots] appointments', minimalApt.error.message);
			return {
				ok: false,
				status: 500,
				error: 'Failed to load appointments',
				detail: minimalApt.error.message,
			};
		}
		appointments = (minimalApt.data || []) as AptRow[];
	} else {
		appointments = (primaryApt.data || []) as AptRow[];
	}

	const bookedSlots: { start: number; end: number }[] = [];
	for (const apt of appointments) {
		const st = String((apt as { status?: string | null }).status || 'scheduled').toLowerCase();
		if (st === 'cancelled') continue;
		const t = String((apt as { appointment_time?: string }).appointment_time || '09:00');
		const [h, m] = t.split(':').map((x) => parseInt(x, 10));
		const startMinutes = (h || 0) * 60 + (m || 0);
		bookedSlots.push({ start: startMinutes, end: startMinutes + duration });
	}

	const now = opts?.now ?? new Date();
	const todayYmd = formatYmdInTimeZone(now, tz);
	const nowCutoffStartMinutes =
		date === todayYmd ? getWallClockMinutesFromMidnightInTimeZone(now, tz) : null;

	const slots = buildSlotGridWithAvailability(ranges, duration, bookedSlots, 15, {
		nowCutoffStartMinutes,
	});
	const weeklySummary = weeklyHoursSummaryLines(weekly);

	let bookedCount = 0;
	for (const apt of appointments || []) {
		const st = String((apt as { status?: string | null }).status || 'scheduled').toLowerCase();
		if (st !== 'cancelled') bookedCount += 1;
	}

	return {
		ok: true,
		date,
		provider_id: providerId,
		duration_minutes: duration,
		timezone: tz,
		weekday_key: dayKey,
		weekly_summary: weeklySummary,
		booked_count: bookedCount,
		slots,
		available_times: slots.filter((s) => s.available).map((s) => s.time),
	};
}
