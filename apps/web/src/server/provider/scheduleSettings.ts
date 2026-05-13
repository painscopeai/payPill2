/** Weekly availability for provider self-serve onboarding + smart calendar. */

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

const DAY_KEY_SET = new Set<string>(DAY_KEYS);

const SHORT_WD_TO_KEY: Record<string, DayKey> = {
	Sun: 'sun',
	Mon: 'mon',
	Tue: 'tue',
	Wed: 'wed',
	Thu: 'thu',
	Fri: 'fri',
	Sat: 'sat',
};

export function parseTimeToMinutes(t: string): number | null {
	const s = String(t || '').trim();
	const m = /^(\d{1,2}):(\d{2})$/.exec(s);
	if (!m) return null;
	const h = parseInt(m[1], 10);
	const min = parseInt(m[2], 10);
	if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
	return h * 60 + min;
}

export type WeeklyInterval = { start: string; end: string };

export type WeeklyHours = Partial<Record<DayKey, WeeklyInterval[]>>;

/** Validate and normalize weekly_hours JSON; drops empty day arrays. */
export function validateWeeklyHours(raw: unknown): { ok: true; value: WeeklyHours } | { ok: false; error: string } {
	if (raw === null || raw === undefined) return { ok: true, value: {} };
	if (typeof raw !== 'object' || Array.isArray(raw)) {
		return { ok: false, error: 'weekly_hours must be an object' };
	}
	const obj = raw as Record<string, unknown>;
	const out: WeeklyHours = {};
	for (const [key, val] of Object.entries(obj)) {
		const k = key.toLowerCase() as DayKey;
		if (!DAY_KEY_SET.has(k)) {
			return { ok: false, error: `Invalid weekday key: ${key}` };
		}
		if (!Array.isArray(val)) {
			return { ok: false, error: `weekly_hours.${k} must be an array` };
		}
		const windows: WeeklyInterval[] = [];
		for (let i = 0; i < val.length; i++) {
			const w = val[i];
			if (!w || typeof w !== 'object' || Array.isArray(w)) {
				return { ok: false, error: `Invalid window on ${k}[${i}]` };
			}
			const start = typeof (w as { start?: unknown }).start === 'string' ? (w as { start: string }).start : '';
			const end = typeof (w as { end?: unknown }).end === 'string' ? (w as { end: string }).end : '';
			const sm = parseTimeToMinutes(start);
			const em = parseTimeToMinutes(end);
			if (sm === null || em === null) {
				return { ok: false, error: `Invalid start/end time on ${k}[${i}] (use HH:MM)` };
			}
			if (em <= sm) {
				return { ok: false, error: `End must be after start on ${k}[${i}]` };
			}
			windows.push({ start: start.trim(), end: end.trim() });
		}
		if (windows.length) out[k] = windows;
	}
	return { ok: true, value: out };
}

export function weeklyHoursHasAnyWindow(weekly: WeeklyHours): boolean {
	for (const k of DAY_KEYS) {
		const arr = weekly[k];
		if (Array.isArray(arr) && arr.length > 0) return true;
	}
	return false;
}

/** Civil calendar weekday for Y-M-D interpreted in `timeZone` (IANA). */
export function getDayKeyForYmdInTimeZone(ymd: string, timeZone: string): DayKey {
	const parts = ymd.split('-').map((x) => parseInt(x, 10));
	const y = parts[0];
	const m = parts[1];
	const d = parts[2];
	if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 'mon';

	const pad = (n: number) => String(n).padStart(2, '0');
	const target = `${y}-${pad(m)}-${pad(d)}`;
	let tz = timeZone?.trim() || 'UTC';
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(0);
	} catch {
		tz = 'UTC';
	}

	const calFmt = new Intl.DateTimeFormat('en-CA', {
		timeZone: tz,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	});
	const wdFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });

	const center = Date.UTC(y, m - 1, d, 12, 0, 0);
	for (let offset = -36; offset <= 36; offset++) {
		const probe = new Date(center + offset * 3600 * 1000);
		const cal = calFmt.format(probe);
		if (cal === target) {
			const wd = wdFmt.format(probe);
			const mapped = SHORT_WD_TO_KEY[wd];
			if (mapped) return mapped;
		}
	}

	return DAY_KEYS[new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()] ?? 'mon';
}

export function intervalsToMinuteRanges(day: DayKey, weekly: WeeklyHours): { start: number; end: number }[] {
	const intervals = weekly[day];
	if (!intervals?.length) return [];
	const ranges: { start: number; end: number }[] = [];
	for (const iv of intervals) {
		const sm = parseTimeToMinutes(iv.start);
		const em = parseTimeToMinutes(iv.end);
		if (sm === null || em === null || em <= sm) continue;
		ranges.push({ start: sm, end: em });
	}
	return ranges.sort((a, b) => a.start - b.start);
}

const DEFAULT_DAY_RANGE = { start: 9 * 60, end: 17 * 60 };

/** Suggested start times (HH:MM) on a 15-minute grid within working windows. */
export function buildSlotSuggestions(
	windows: { start: number; end: number }[],
	durationMinutes: number,
	bookedSlots: { start: number; end: number }[],
	stepMinutes = 15,
): { time: string; available: boolean }[] {
	const seen = new Set<string>();
	const out: { time: string; available: boolean }[] = [];
	for (const w of windows.length ? windows : [DEFAULT_DAY_RANGE]) {
		for (let slotStart = w.start; slotStart + durationMinutes <= w.end; slotStart += stepMinutes) {
			const slotEnd = slotStart + durationMinutes;
			const clash = bookedSlots.some((b) => slotStart < b.end && slotEnd > b.start);
			if (clash) continue;
			const h = Math.floor(slotStart / 60);
			const m = slotStart % 60;
			const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
			if (seen.has(timeStr)) continue;
			seen.add(timeStr);
			out.push({ time: timeStr, available: true });
		}
	}
	out.sort((a, b) => a.time.localeCompare(b.time));
	return out;
}
