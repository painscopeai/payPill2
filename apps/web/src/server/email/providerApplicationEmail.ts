/**
 * Resend notifications for provider application lifecycle.
 * `sendMail` is soft-fail (logs and skips) for optional notices.
 * `sendMailStrict` throws when Resend is misconfigured or rejects the send — use for applicant-critical mail.
 */

import { getPublicAppOrigin } from '@/server/utils/providerApplicationInvite';

export type SendMailStrictResult = { resendEmailId: string | undefined };

async function sendMailStrict(opts: {
	to: string | string[];
	subject: string;
	html: string;
}): Promise<SendMailStrictResult> {
	const key = process.env.RESEND_API_KEY?.trim();
	if (!key) {
		throw Object.assign(
			new Error(
				'RESEND_API_KEY is not set on the server. Add it in Vercel (Production) so onboarding emails can be delivered.',
			),
			{ status: 503 },
		);
	}
	const from = process.env.RESEND_FROM?.trim() || process.env.EMAIL_FROM?.trim();
	if (!from) {
		throw Object.assign(
			new Error(
				'RESEND_FROM or EMAIL_FROM is not set. Use a verified domain sender in Resend (e.g. PayPill <onboarding@yourdomain.com>).',
			),
			{ status: 503 },
		);
	}
	let ResendCtor: typeof import('resend').Resend;
	try {
		({ Resend: ResendCtor } = await import('resend'));
	} catch (e) {
		throw Object.assign(new Error('Resend package failed to load'), { status: 500, cause: e });
	}
	const resend = new ResendCtor(key);
	const { data, error } = await resend.emails.send({
		from,
		to: Array.isArray(opts.to) ? opts.to : [opts.to],
		subject: opts.subject,
		html: opts.html,
	});
	if (error) {
		const msg =
			typeof error === 'object' && error !== null && 'message' in error
				? String((error as { message: unknown }).message)
				: JSON.stringify(error);
		console.error('[providerApplicationEmail] Resend send failed:', error);
		throw Object.assign(
			new Error(
				`Resend rejected the email (${msg}). Confirm the API key, verified sender domain, and recipient allowlisting in Resend.`,
			),
			{ status: 502 },
		);
	}
	return { resendEmailId: data?.id };
}

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
}): Promise<SendMailStrictResult> {
	const origin = getPublicAppOrigin();
	const org = escapeHtml(params.organizationName || 'your organization');
	return sendMailStrict({
		to: params.to,
		subject: '[PayPill] Welcome — your provider onboarding is complete',
		html: `<p>Hi,</p>
<p>Great news: your provider application for <strong>${org}</strong> has been <strong>approved</strong>. Your organization is onboarded in PayPill.</p>
<p><a href="${escapeHtml(origin)}" style="display:inline-block;padding:10px 16px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Go to PayPill</a></p>
<p style="font-size:14px;color:#444;">If the button does not work, copy this link into your browser:<br/><a href="${escapeHtml(origin)}">${escapeHtml(origin)}</a></p>
<p style="font-size:13px;color:#666;">Sign in with the same email you used on your application to access your provider tools when your account is connected.</p>
<p style="font-size:13px;color:#666;">Your provider reference (for support): <code>${escapeHtml(params.providerId)}</code></p>
<p style="font-size:13px;color:#666;">Profile verification may still show as pending while we complete our checks.</p>
<p>— PayPill</p>`,
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
