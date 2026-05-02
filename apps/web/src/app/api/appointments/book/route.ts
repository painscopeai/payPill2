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

	const { copay_estimate } = await resolveCopayEstimate({
		visitTypeId: visitType.id,
		insuranceOptionId: insuranceRow.id,
	});

	const pname = providerName || prov.provider_name || prov.name;
	const confirmationNumber = `APT-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;

	const row = {
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
		visit_type_id: visitType.id,
		insurance_option_id: insuranceRow.id,
		meeting_url: null,
	};

	const { data: appointment, error: insErr } = await sb.from('appointments').insert(row).select().single();
	if (insErr) {
		console.error('[appointments/book]', insErr);
		return NextResponse.json({ error: 'Failed to book appointment' }, { status: 500 });
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
