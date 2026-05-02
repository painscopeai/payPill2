import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import {
	getInsuranceOption,
	getVisitTypeBySlug,
	resolveCopayEstimate,
} from '@/server/admin/appointmentReferenceService';
import { sendBookingConfirmationEmails } from '@/server/email/bookingConfirmationEmail';
import { normalizeAppointmentTime } from '@/lib/appointmentDateTime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function validateAppointmentDateTime(appointmentDate: string, appointmentTime: string) {
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(appointmentDate)) {
		return { valid: false as const, error: 'Invalid date format. Expected YYYY-MM-DD (e.g. 2026-04-29)' };
	}
	const normalizedTime = normalizeAppointmentTime(appointmentTime);
	if (!normalizedTime) {
		return {
			valid: false as const,
			error: 'Invalid time format. Expected HH:MM or HH:MM:SS in 24-hour format (e.g. 14:30)',
		};
	}
	const [year, month, day] = appointmentDate.split('-').map(Number);
	const appointmentDateObj = new Date(year, month - 1, day);
	if (
		appointmentDateObj.getFullYear() !== year ||
		appointmentDateObj.getMonth() !== month - 1 ||
		appointmentDateObj.getDate() !== day
	) {
		return { valid: false as const, error: 'Invalid calendar date. Please check the date values.' };
	}
	const today = new Date();
	const todayAtStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	if (appointmentDateObj.getTime() < todayAtStartOfDay.getTime()) {
		return { valid: false as const, error: 'Appointment date is in the past. Please select today or a future date.' };
	}
	return { valid: true as const };
}

/**
 * Only the copay-matrix FK columns may be absent when that part of the migration
 * was skipped. Retrying without them is safe. Retrying when core columns like
 * `appointment_date` are missing would fail the same way — handle separately.
 */
function shouldRetryInsertWithoutOptionalFkColumns(err: { code?: string; message?: string }): boolean {
	const code = String(err.code || '');
	if (code !== 'PGRST204' && code !== '42703') return false;
	const msg = (err.message || '').toLowerCase();
	return (
		msg.includes('visit_type_id') ||
		msg.includes('insurance_option_id') ||
		msg.includes('meeting_url')
	);
}

function isPostgrestSchemaColumnError(err: { code?: string; message?: string } | null): boolean {
	if (!err) return false;
	const c = String(err.code || '');
	return c === 'PGRST204' || c === '42703';
}

function sanitizeCopayAmount(n: number): number {
	if (!Number.isFinite(n) || n < 0) return 0;
	return Math.round(n * 100) / 100;
}

/** Browsers open the URL with GET; this route only accepts POST. */
export async function GET() {
	return NextResponse.json(
		{
			error: 'Method not allowed',
			allowed: ['POST', 'OPTIONS'],
			usage: 'Send a POST request with a JSON body to book an appointment.',
		},
		{ status: 405, headers: { Allow: 'POST, OPTIONS' } },
	);
}

export async function OPTIONS() {
	return new NextResponse(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
}

export async function POST(request: NextRequest) {
	const userId = await getBearerUserId(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body: {
		userId?: string;
		providerId?: string;
		providerName?: string;
		appointmentType?: string;
		appointmentDate?: string;
		appointmentTime?: string;
		location?: string;
		reason?: string;
		insuranceInfo?: string;
		insuranceOptionId?: string;
		copayAmount?: number;
	};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (body.userId !== userId) {
		return NextResponse.json({ error: 'User mismatch' }, { status: 403 });
	}

	const {
		userId: uid,
		providerId,
		providerName,
		appointmentType,
		appointmentDate,
		appointmentTime,
		location,
		reason,
		insuranceInfo,
		insuranceOptionId,
	} = body;

	if (!uid || !providerId || !appointmentDate || !appointmentTime || !appointmentType) {
		return NextResponse.json(
			{
				error: 'Missing required fields: userId, providerId, appointmentDate, appointmentTime, appointmentType',
			},
			{ status: 400 },
		);
	}

	if (!insuranceOptionId) {
		return NextResponse.json({ error: 'insuranceOptionId is required' }, { status: 400 });
	}

	const dt = validateAppointmentDateTime(appointmentDate, appointmentTime);
	if (!dt.valid) {
		return NextResponse.json({ error: dt.error }, { status: 400 });
	}
	const appointmentTimeStored = normalizeAppointmentTime(appointmentTime)!;

	const sb = getSupabaseAdmin();

	const { data: provider, error: pErr } = await sb
		.from('providers')
		.select('id, provider_name, name, address, email, status, verification_status, scheduling_url')
		.eq('id', providerId)
		.maybeSingle();
	if (pErr || !provider) {
		return NextResponse.json({ error: 'Provider not found' }, { status: 400 });
	}
	const prov = provider as {
		id: string;
		provider_name: string | null;
		name: string;
		address: string | null;
		email: string | null;
		status: string;
		verification_status: string | null;
		scheduling_url: string | null;
	};
	if (prov.status !== 'active' || prov.verification_status !== 'verified') {
		return NextResponse.json({ error: 'Provider is not available for booking' }, { status: 400 });
	}

	const visitType = await getVisitTypeBySlug(appointmentType);
	if (!visitType?.active) {
		return NextResponse.json({ error: 'Invalid or inactive visit type' }, { status: 400 });
	}

	const insuranceRow = await getInsuranceOption(insuranceOptionId);
	if (!insuranceRow?.active) {
		return NextResponse.json({ error: 'Invalid or inactive insurance option' }, { status: 400 });
	}

	let copay_estimate: number;
	try {
		const resolved = await resolveCopayEstimate({
			visitTypeId: visitType.id,
			insuranceOptionId: insuranceRow.id,
		});
		copay_estimate = sanitizeCopayAmount(resolved.copay_estimate);
	} catch (e) {
		console.error('[appointments/book] resolveCopayEstimate', e);
		return NextResponse.json(
			{
				error:
					'Could not compute pricing for this visit. Ensure database migrations are applied (appointment_copay_matrix).',
			},
			{ status: 503 },
		);
	}

	const pname = providerName || prov.provider_name || prov.name;
	const confirmationNumber = `APT-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;

	const rowBase = {
		user_id: uid,
		provider_id: providerId,
		provider_name: pname,
		type: appointmentType,
		appointment_date: appointmentDate,
		appointment_time: appointmentTimeStored,
		appointment_type: appointmentType,
		location: location || prov.address || null,
		reason: reason || '',
		insurance_info: insuranceInfo || insuranceRow.label || '',
		copay_amount: copay_estimate,
		confirmation_number: confirmationNumber,
		status: 'confirmed',
	};

	const rowFull = {
		...rowBase,
		visit_type_id: visitType.id,
		insurance_option_id: insuranceRow.id,
		meeting_url: null as string | null,
	};

	let appointment: { id: string } | null = null;
	let insErr: { code?: string; message?: string; details?: string; hint?: string } | null = null;

	const attemptFull = await sb.from('appointments').insert(rowFull).select().single();
	if (attemptFull.error && shouldRetryInsertWithoutOptionalFkColumns(attemptFull.error)) {
		const retry = await sb.from('appointments').insert(rowBase).select().single();
		appointment = retry.data as { id: string } | null;
		insErr = retry.error;
		if (!insErr) {
			console.warn(
				'[appointments/book] Inserted without visit_type_id/insurance_option_id/meeting_url; apply migration 20260511120000_appointment_copay_matrix.sql',
			);
		}
	} else if (attemptFull.error) {
		appointment = attemptFull.data as { id: string } | null;
		insErr = attemptFull.error;
	} else {
		appointment = attemptFull.data as { id: string };
	}

	if (insErr || !appointment) {
		console.error('[appointments/book] insert', insErr);
		if (insErr?.code === '23503') {
			return NextResponse.json(
				{
					error:
						'This booking could not be linked to your account or the provider. Try again or contact support.',
				},
				{ status: 400 },
			);
		}
		if (isPostgrestSchemaColumnError(insErr)) {
			return NextResponse.json(
				{
					error:
						'Booking storage is not configured on the server. Apply Supabase migrations so the appointments table includes booking columns (e.g. appointment_date).',
					code: 'SCHEMA_APPOINTMENTS_INCOMPLETE',
					hint: 'Run `supabase db push` or execute supabase/migrations/20260516120000_ensure_appointments_booking_schema.sql in the Supabase SQL editor, then retry.',
					...(process.env.NODE_ENV === 'development' && insErr?.message
						? { detail: insErr.message }
						: {}),
				},
				{ status: 503 },
			);
		}
		const devHint =
			process.env.NODE_ENV === 'development' && insErr?.message
				? { detail: insErr.message }
				: {};
		return NextResponse.json(
			{ error: 'Failed to book appointment', ...devHint },
			{ status: 500 },
		);
	}

	const { data: profile } = await sb
		.from('profiles')
		.select('email, first_name, last_name, name')
		.eq('id', uid)
		.maybeSingle();
	const prof = profile as {
		email: string | null;
		first_name: string | null;
		last_name: string | null;
		name: string | null;
	} | null;
	const patientName =
		prof?.name?.trim() ||
		[prof?.first_name, prof?.last_name].filter(Boolean).join(' ').trim() ||
		'Patient';

	const visitLabel = visitType.label;
	const insuranceLabel = insuranceRow.label;

	void sendBookingConfirmationEmails({
		patientEmail: prof?.email ?? null,
		patientName,
		providerEmail: prov.email,
		providerDisplayName: pname,
		appointmentDate,
		appointmentTime: appointmentTimeStored,
		visitLabel,
		insuranceLabel,
		copay: copay_estimate,
		confirmationNumber,
		reason: reason || '',
		locationLine: (location || prov.address || '').trim() || null,
		schedulingUrl: prov.scheduling_url,
	});

	const apt = appointment as { id: string };
	return NextResponse.json(
		{
			id: apt.id,
			confirmationNumber,
			status: 'confirmed',
			appointmentDate,
			appointmentTime: appointmentTimeStored,
			provider: pname,
			location: location || prov.address,
			copayAmount: copay_estimate,
		},
		{ status: 201 },
	);
}
