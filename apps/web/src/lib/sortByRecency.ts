/** Parse a date/time string to epoch ms (0 if invalid). */
export function toTimestamp(value: unknown): number {
	if (value == null || value === '') return 0;
	if (value instanceof Date) {
		const t = value.getTime();
		return Number.isNaN(t) ? 0 : t;
	}
	const raw = String(value).trim();
	if (!raw) return 0;
	const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw;
	const t = Date.parse(normalized);
	return Number.isNaN(t) ? 0 : t;
}

/** Appointment date + optional time → sortable timestamp. */
export function appointmentTimestamp(
	appointmentDate: unknown,
	appointmentTime?: unknown,
): number {
	const d = String(appointmentDate || '').slice(0, 10);
	if (!d) return 0;
	const t = String(appointmentTime || '12:00:00').slice(0, 8);
	return toTimestamp(`${d}T${t}`);
}

/**
 * Sort copy of items newest-first using a timestamp extractor.
 * Stable tie-break via optional secondary key (string compare desc).
 */
export function sortByRecencyDesc<T>(
	items: T[],
	getTimestamp: (item: T) => number,
	tieBreak?: (a: T, b: T) => number,
): T[] {
	return [...items].sort((a, b) => {
		const tb = getTimestamp(b);
		const ta = getTimestamp(a);
		if (tb !== ta) return tb - ta;
		return tieBreak ? tieBreak(a, b) : 0;
	});
}

/** Pick the latest non-zero timestamp from row fields. */
export function maxTimestamp(...values: unknown[]): number {
	let max = 0;
	for (const v of values) {
		const t = toTimestamp(v);
		if (t > max) max = t;
	}
	return max;
}
