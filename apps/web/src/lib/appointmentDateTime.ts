/**
 * HTML `<input type="time">` may send HH:MM or HH:MM:SS depending on browser.
 * API and DB store HH:MM.
 */
export function normalizeAppointmentTime(raw: string): string | null {
	const t = raw.trim();
	const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
	if (!m) return null;
	const h = parseInt(m[1], 10);
	const min = parseInt(m[2], 10);
	if (h > 23 || min > 59) return null;
	return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
