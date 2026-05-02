/**
 * Booking confirmations go **both ways** when Resend is configured:
 * - **Patient** — confirmation to the address on their profile (`patientEmail`).
 * - **Provider (doctor)** — new-booking notice to the provider record (`providerEmail`).
 * Each recipient gets a separate message. Non-fatal if Resend env vars are missing or an address is absent.
 */

function esc(s: string) {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export async function sendBookingConfirmationEmails(opts: {
	patientEmail: string | null;
	patientName: string;
	providerEmail: string | null;
	providerDisplayName: string;
	appointmentDate: string;
	appointmentTime: string;
	visitLabel: string;
	insuranceLabel: string;
	copay: number;
	confirmationNumber: string;
	reason: string;
	locationLine: string | null;
	schedulingUrl: string | null;
}): Promise<void> {
	const key = process.env.RESEND_API_KEY?.trim();
	const from = process.env.RESEND_FROM?.trim() || process.env.EMAIL_FROM?.trim();
	if (!key || !from) {
		console.warn('[bookingConfirmationEmail] RESEND_API_KEY or RESEND_FROM missing; skipping emails');
		return;
	}

	let ResendCtor: typeof import('resend').Resend;
	try {
		({ Resend: ResendCtor } = await import('resend'));
	} catch (e) {
		console.warn('[bookingConfirmationEmail] resend package unavailable:', e);
		return;
	}
	const resend = new ResendCtor(key);

	const copayStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(opts.copay);
	const scheduleBlock = opts.schedulingUrl
		? `<p><strong>Scheduling link:</strong> <a href="${esc(opts.schedulingUrl)}">${esc(opts.schedulingUrl)}</a></p>`
		: '';

	const commonBody = `
<p><strong>Date:</strong> ${esc(opts.appointmentDate)} at ${esc(opts.appointmentTime)}</p>
<p><strong>Visit type:</strong> ${esc(opts.visitLabel)}</p>
<p><strong>Insurance:</strong> ${esc(opts.insuranceLabel)}</p>
<p><strong>Estimated copay:</strong> ${esc(copayStr)}</p>
${opts.locationLine ? `<p><strong>Location:</strong> ${esc(opts.locationLine)}</p>` : ''}
<p><strong>Reason:</strong> ${esc(opts.reason || '—')}</p>
<p><strong>Confirmation #:</strong> ${esc(opts.confirmationNumber)}</p>
${scheduleBlock}
<p style="color:#666;font-size:12px">Estimate only; final amount determined at check-in.</p>
`;

	const patientHtml = `
<h1>Appointment confirmed</h1>
<p>Hi ${esc(opts.patientName)},</p>
<p>Your appointment with <strong>${esc(opts.providerDisplayName)}</strong> is booked.</p>
${commonBody}
`;

	const providerHtml = `
<h1>New appointment booking</h1>
<p>Hello ${esc(opts.providerDisplayName)},</p>
<p><strong>${esc(opts.patientName)}</strong> booked an appointment.</p>
${commonBody}
`;

	const sendOne = async (to: string, subject: string, html: string) => {
		const { error } = await resend.emails.send({ from, to, subject, html });
		if (error) {
			console.error('[bookingConfirmationEmail] Resend error:', error);
		}
	};

	const tasks: Promise<void>[] = [];
	if (opts.patientEmail) {
		tasks.push(
			sendOne(
				opts.patientEmail,
				`Appointment confirmed — ${opts.confirmationNumber}`,
				patientHtml,
			),
		);
	} else {
		console.warn('[bookingConfirmationEmail] No patient email; skipping patient notification');
	}
	if (opts.providerEmail) {
		tasks.push(
			sendOne(
				opts.providerEmail,
				`New booking: ${opts.patientName} — ${opts.confirmationNumber}`,
				providerHtml,
			),
		);
	} else {
		console.warn('[bookingConfirmationEmail] No provider email; skipping provider notification');
	}
	await Promise.all(tasks);
}
