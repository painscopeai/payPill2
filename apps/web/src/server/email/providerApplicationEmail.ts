/**
 * Resend notifications for provider application lifecycle.
 * Safe to call without RESEND_API_KEY (logs and skips).
 */

async function sendMail(opts: { to: string | string[]; subject: string; html: string }) {
	const key = process.env.RESEND_API_KEY?.trim();
	if (!key) {
		console.warn('[providerApplicationEmail] RESEND_API_KEY not set; skipping email');
		return;
	}
	const from = process.env.RESEND_FROM?.trim() || process.env.EMAIL_FROM?.trim();
	if (!from) {
		console.warn('[providerApplicationEmail] RESEND_FROM not set; skipping email');
		return;
	}
	let resend: import('resend').Resend;
	try {
		const { Resend } = await import('resend');
		resend = new Resend(key);
	} catch (e) {
		console.warn('[providerApplicationEmail] resend package unavailable:', e);
		return;
	}
	const { error } = await resend.emails.send({
		from,
		to: Array.isArray(opts.to) ? opts.to : [opts.to],
		subject: opts.subject,
		html: opts.html,
	});
	if (error) {
		console.error('[providerApplicationEmail] send failed:', error);
	}
}

function notifyRecipients(): string[] {
	const raw = process.env.PROVIDER_APPLICATION_NOTIFY_TO?.trim() || process.env.ADMIN_NOTIFY_EMAIL?.trim();
	if (!raw) return [];
	return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function notifyApplicantInvite(params: {
	to: string;
	organizationName: string;
	inviteUrl: string;
}): Promise<void> {
	await sendMail({
		to: params.to,
		subject: `[PayPill] Complete your provider application`,
		html: `<p>You were invited to complete a provider application for <strong>${escapeHtml(params.organizationName || 'your organization')}</strong>.</p>
<p><a href="${escapeHtml(params.inviteUrl)}">Open the questionnaire</a></p>
<p>If the button does not work, copy this link into your browser:<br/><code style="word-break:break-all">${escapeHtml(params.inviteUrl)}</code></p>`,
	});
}

export async function notifyApplicationSubmitted(params: {
	applicationId: string;
	organizationName: string;
	type: string;
	applicantEmail: string;
}): Promise<void> {
	const recipients = notifyRecipients();
	if (recipients.length === 0) {
		console.warn('[providerApplicationEmail] PROVIDER_APPLICATION_NOTIFY_TO not set; skipping admin notify');
		return;
	}
	await sendMail({
		to: recipients,
		subject: `[PayPill] New provider application: ${params.organizationName || params.applicationId}`,
		html: `<p>A provider application was submitted.</p>
<ul>
<li><strong>ID</strong>: ${params.applicationId}</li>
<li><strong>Organization</strong>: ${escapeHtml(params.organizationName || '—')}</li>
<li><strong>Type</strong>: ${escapeHtml(params.type || '—')}</li>
<li><strong>Applicant email</strong>: ${escapeHtml(params.applicantEmail)}</li>
</ul>`,
	});
}

export async function notifyApplicantApproved(params: {
	to: string;
	organizationName: string;
	providerId: string;
}): Promise<void> {
	await sendMail({
		to: params.to,
		subject: '[PayPill] Your provider application was approved',
		html: `<p>Your application for <strong>${escapeHtml(params.organizationName)}</strong> has been approved.</p>
<p>Your provider record ID: <code>${escapeHtml(params.providerId)}</code></p>`,
	});
}

export async function notifyApplicantRejected(params: {
	to: string;
	organizationName: string;
	reason: string;
}): Promise<void> {
	await sendMail({
		to: params.to,
		subject: '[PayPill] Provider application update',
		html: `<p>Your application for <strong>${escapeHtml(params.organizationName || 'your organization')}</strong> was not approved.</p>
<p><strong>Reason:</strong> ${escapeHtml(params.reason)}</p>`,
	});
}

function escapeHtml(s: string) {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
