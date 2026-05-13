import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/calendar/smart?date=YYYY-MM-DD&duration_minutes=30 */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const date = String(url.searchParams.get('date') || '').trim();
	const duration = Math.max(15, parseInt(String(url.searchParams.get('duration_minutes') || '30'), 10) || 30);

	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return NextResponse.json({ error: 'Query param date (YYYY-MM-DD) is required' }, { status: 400 });
	}

	if (!ctx.providerOrgId) {
		return NextResponse.json({
			date,
			duration_minutes: duration,
			suggestions: [],
			booked_count: 0,
			message: 'Link your practice to load calendar availability.',
		});
	}

	const sb = getSupabaseAdmin();
	const { data: appointments, error } = await sb
		.from('appointments')
		.select('id, appointment_time, duration_minutes')
		.eq('provider_id', ctx.providerOrgId)
		.eq('appointment_date', date);

	if (error) {
		console.error('[api/provider/calendar/smart]', error.message);
		return NextResponse.json({ error: 'Failed to load calendar' }, { status: 500 });
	}

	const workStart = 9;
	const workEnd = 17;
	const bookedSlots: { start: number; end: number }[] = [];
	for (const apt of appointments || []) {
		const t = String((apt as { appointment_time?: string }).appointment_time || '09:00');
		const [h, m] = t.split(':').map((x) => parseInt(x, 10));
		const startMinutes = (h || 0) * 60 + (m || 0);
		const dur = Number((apt as { duration_minutes?: number }).duration_minutes) || 30;
		bookedSlots.push({ start: startMinutes, end: startMinutes + dur });
	}

	const suggestions: { time: string; available: boolean }[] = [];
	for (let hour = workStart; hour < workEnd; hour++) {
		for (let minute = 0; minute < 60; minute += 15) {
			const slotStart = hour * 60 + minute;
			const slotEnd = slotStart + duration;
			if (slotEnd > workEnd * 60) break;
			const isAvailable = !bookedSlots.some((slot) => slotStart < slot.end && slotEnd > slot.start);
			if (isAvailable) {
				const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
				suggestions.push({ time: timeStr, available: true });
			}
		}
	}

	return NextResponse.json({
		date,
		duration_minutes: duration,
		suggestions,
		booked_count: (appointments || []).length,
	});
}
