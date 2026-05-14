import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getPatientBookingSlotsForDate } from '@/server/provider/patientBookingDaySlots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

	let durationOverride: number | undefined;
	if (rawDur != null && String(rawDur).trim() !== '') {
		const d = parseInt(String(rawDur), 10);
		if (Number.isFinite(d)) durationOverride = d;
	}

	const result = await getPatientBookingSlotsForDate(sb, providerId, date, {
		...(durationOverride != null ? { durationMinutesOverride: durationOverride } : {}),
	});

	if (!result.ok) {
		const body: Record<string, string> = { error: result.error };
		if (result.detail) body.detail = result.detail;
		return NextResponse.json(body, { status: result.status });
	}

	return NextResponse.json({
		date: result.date,
		provider_id: result.provider_id,
		duration_minutes: result.duration_minutes,
		timezone: result.timezone,
		weekday_key: result.weekday_key,
		weekly_summary: result.weekly_summary,
		booked_count: result.booked_count,
		slots: result.slots,
		available_times: result.available_times,
	});
}
