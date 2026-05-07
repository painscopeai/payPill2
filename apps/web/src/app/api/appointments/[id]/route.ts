import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { normalizeAppointmentTime } from '@/lib/appointmentDateTime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function parseLocalDay(dateStr: string | null | undefined) {
	if (!dateStr) return null;
	const [y, mo, d] = String(dateStr).split('-').map(Number);
	if (!y || !mo || !d) return null;
	return new Date(y, mo - 1, d);
}

function startOfTodayLocal() {
	const n = new Date();
	return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function validateFutureOrToday(dateStr: string): boolean {
	const day = parseLocalDay(dateStr);
	if (!day) return false;
	return day.getTime() >= startOfTodayLocal().getTime();
}

type PatchBody = {
	action?: 'cancel' | 'reschedule';
	appointmentDate?: string;
	appointmentTime?: string;
};

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const userId = await getBearerUserId(request);
	if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const { id } = await params;

	let body: PatchBody;
	try {
		body = (await request.json()) as PatchBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const action = String(body.action || '').toLowerCase();
	if (action !== 'cancel' && action !== 'reschedule') {
		return NextResponse.json({ error: 'action must be cancel or reschedule' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const { data: row, error: fetchErr } = await sb
		.from('appointments')
		.select('id,user_id,status,appointment_date')
		.eq('id', id)
		.maybeSingle();
	if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
	if (!row || row.user_id !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const currentStatus = String(row.status || '').toLowerCase();
	if (currentStatus === 'cancelled') {
		return NextResponse.json({ error: 'Appointment is already cancelled' }, { status: 400 });
	}

	const aptDay = parseLocalDay(row.appointment_date);
	const today = startOfTodayLocal();

	if (action === 'cancel') {
		if (aptDay && aptDay.getTime() <= today.getTime()) {
			return NextResponse.json(
				{ error: 'Appointments cannot be cancelled on or after the appointment day' },
				{ status: 400 },
			);
		}
		const { error: upErr } = await sb
			.from('appointments')
			.update({ status: 'cancelled' })
			.eq('id', id)
			.eq('user_id', userId);
		if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
		return NextResponse.json({ ok: true, status: 'cancelled' });
	}

	const newDate = String(body.appointmentDate || '').trim();
	const newTimeRaw = String(body.appointmentTime || '').trim();
	const normalizedTime = normalizeAppointmentTime(newTimeRaw);
	if (!newDate || !normalizedTime || !validateFutureOrToday(newDate)) {
		return NextResponse.json(
			{ error: 'Valid appointmentDate (YYYY-MM-DD) and appointmentTime are required' },
			{ status: 400 },
		);
	}

	const { error: upErr } = await sb
		.from('appointments')
		.update({
			appointment_date: newDate,
			appointment_time: normalizedTime,
			status: 'confirmed',
		})
		.eq('id', id)
		.eq('user_id', userId);
	if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

	return NextResponse.json({
		ok: true,
		status: 'confirmed',
		appointmentDate: newDate,
		appointmentTime: normalizedTime,
	});
}

