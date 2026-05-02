import jwt from 'jsonwebtoken';

export type ProviderApplicationInvitePayload = {
	applicationId: string;
	formId: string;
	applicantEmail: string;
};

const AUD = 'provider_application_invite';

function secret(): string {
	const s = process.env.PROVIDER_APPLICATION_INVITE_SECRET?.trim();
	if (!s) {
		throw Object.assign(new Error('PROVIDER_APPLICATION_INVITE_SECRET is not configured'), { status: 500 });
	}
	return s;
}

/** Issue an invite link token (admin invite route). */
export function signProviderApplicationInviteToken(payload: ProviderApplicationInvitePayload): string {
	return jwt.sign(
		{
			applicationId: payload.applicationId,
			formId: payload.formId,
			applicantEmail: payload.applicantEmail,
			aud: AUD,
		},
		secret(),
		{ expiresIn: '14d', algorithm: 'HS256' },
	);
}

/** Validate token from applicant form submission. */
export function verifyProviderApplicationInviteToken(token: string): ProviderApplicationInvitePayload {
	let decoded: jwt.JwtPayload & Record<string, unknown>;
	try {
		decoded = jwt.verify(token, secret(), {
			algorithms: ['HS256'],
		}) as jwt.JwtPayload & Record<string, unknown>;
	} catch {
		throw Object.assign(new Error('Invalid or expired invitation link'), { status: 400 });
	}
	if (decoded.aud !== AUD) {
		throw Object.assign(new Error('Invalid invitation token'), { status: 400 });
	}
	const applicationId = decoded.applicationId;
	const formId = decoded.formId;
	const applicantEmail = decoded.applicantEmail;
	if (
		typeof applicationId !== 'string' ||
		typeof formId !== 'string' ||
		typeof applicantEmail !== 'string' ||
		!applicationId ||
		!formId ||
		!applicantEmail
	) {
		throw Object.assign(new Error('Invalid invitation token payload'), { status: 400 });
	}
	return { applicationId, formId, applicantEmail };
}

/** Public site origin for invite URLs (no trailing slash). */
export function getPublicAppOrigin(): string {
	const fromEnv =
		process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ||
		process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
		process.env.NEXT_PUBLIC_WEB_ORIGIN?.trim();
	if (fromEnv) {
		return fromEnv.replace(/\/$/, '');
	}
	const vercel = process.env.VERCEL_URL?.trim();
	if (vercel) {
		return `https://${vercel.replace(/^https?:\/\//, '')}`;
	}
	return 'http://localhost:5173';
}
