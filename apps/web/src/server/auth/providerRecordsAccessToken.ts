import jwt from 'jsonwebtoken';

const AUD = 'provider_patient_records';
const DEFAULT_TTL_SEC = 30 * 60; // 30 minutes

export type ProviderRecordsAccessPayload = {
	providerId: string;
	patientId: string;
};

function secret(): string {
	const s =
		process.env.PROVIDER_RECORDS_ACCESS_SECRET?.trim() ||
		process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
	if (!s) {
		throw Object.assign(new Error('PROVIDER_RECORDS_ACCESS_SECRET is not configured'), { status: 500 });
	}
	return s;
}

export function signProviderRecordsAccessToken(payload: ProviderRecordsAccessPayload): string {
	return jwt.sign(
		{
			providerId: payload.providerId,
			patientId: payload.patientId,
			aud: AUD,
		},
		secret(),
		{ expiresIn: DEFAULT_TTL_SEC, algorithm: 'HS256' },
	);
}

export function verifyProviderRecordsAccessToken(
	token: string | null | undefined,
	expected: ProviderRecordsAccessPayload,
): boolean {
	if (!token?.trim()) return false;
	try {
		const decoded = jwt.verify(token.trim(), secret(), {
			algorithms: ['HS256'],
		}) as jwt.JwtPayload & { providerId?: string; patientId?: string; aud?: string };
		if (decoded.aud !== AUD) return false;
		return decoded.providerId === expected.providerId && decoded.patientId === expected.patientId;
	} catch {
		return false;
	}
}
