export function normalizeAppointmentList(payload) {
	if (Array.isArray(payload)) return payload;
	if (!payload || typeof payload !== 'object') return [];
	if (Array.isArray(payload.data)) return payload.data;
	if (Array.isArray(payload.appointments)) return payload.appointments;
	if (Array.isArray(payload.items)) return payload.items;
	return [];
}

export function parseLocalDay(dateStr) {
	if (!dateStr) return null;
	const [y, mo, d] = String(dateStr).split('-').map(Number);
	if (!y || !mo || !d) return null;
	return new Date(y, mo - 1, d);
}

export function startOfTodayLocal() {
	const n = new Date();
	return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function formatDisplayTime(raw) {
	if (!raw || typeof raw !== 'string') return '';
	const t = raw.trim();
	if (/am|pm/i.test(t)) return t;
	const parts = t.split(':');
	const h = parseInt(parts[0], 10);
	const m = parseInt(parts[1] || '0', 10);
	if (Number.isNaN(h)) return t;
	const d = new Date();
	d.setHours(h, m, 0, 0);
	return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatAppointmentSubtitle(apt) {
	const day = parseLocalDay(apt.appointment_date);
	const datePart = day
		? day.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
		: 'Date TBD';
	const timePart = formatDisplayTime(apt.appointment_time);
	return timePart ? `${datePart} • ${timePart}` : datePart;
}

export function providerDisplayName(apt) {
	const d = apt.provider_details;
	if (d?.provider_name || d?.name) return d.provider_name || d.name;
	return apt.provider_name || 'Provider';
}

export function appointmentHeadline(apt) {
	const name = providerDisplayName(apt);
	const specialty = apt.provider_details?.specialty || apt.provider_details?.type || apt.type || '';
	const visit = apt.appointment_type || apt.visit_type || '';
	const extra = specialty || visit;
	if (extra && !name.toLowerCase().includes(String(extra).toLowerCase())) {
		return `${name} (${extra})`;
	}
	return name;
}

export function selectUpcomingAppointments(rows, limit = 2) {
	const today = startOfTodayLocal();
	const upcoming = [];
	for (const apt of rows) {
		const day = parseLocalDay(apt.appointment_date);
		const pastDay = day && day < today;
		const st = (apt.status || '').toLowerCase();
		if (st === 'cancelled' || st === 'completed' || pastDay) continue;
		upcoming.push(apt);
	}
	upcoming.sort((a, b) => {
		const da = a.appointment_date || '';
		const db = b.appointment_date || '';
		if (da !== db) return da.localeCompare(db);
		return (a.appointment_time || '').localeCompare(b.appointment_time || '');
	});
	return upcoming.slice(0, limit);
}
