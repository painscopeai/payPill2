const STORAGE_PREFIX = 'paypill_provider_records_';

export function recordsAccessStorageKey(providerId, patientId) {
	return `${STORAGE_PREFIX}${providerId || 'unknown'}_${patientId}`;
}

/** @returns {string | null} */
export function readStoredRecordsToken(providerId, patientId) {
	if (!patientId || !providerId || typeof sessionStorage === 'undefined') return null;
	try {
		const token = sessionStorage.getItem(recordsAccessStorageKey(providerId, patientId));
		if (!token) return null;
		const payload = JSON.parse(atob(token.split('.')[1]));
		if (payload?.providerId && payload.providerId !== providerId) {
			sessionStorage.removeItem(recordsAccessStorageKey(providerId, patientId));
			return null;
		}
		if (payload?.patientId && payload.patientId !== patientId) {
			sessionStorage.removeItem(recordsAccessStorageKey(providerId, patientId));
			return null;
		}
		if (!payload?.exp || payload.exp * 1000 <= Date.now()) {
			sessionStorage.removeItem(recordsAccessStorageKey(providerId, patientId));
			return null;
		}
		return token;
	} catch {
		return null;
	}
}

export function storeRecordsToken(providerId, patientId, token) {
	if (!patientId || !providerId || !token || typeof sessionStorage === 'undefined') return;
	sessionStorage.setItem(recordsAccessStorageKey(providerId, patientId), token);
}

export function clearRecordsToken(providerId, patientId) {
	if (!patientId || !providerId || typeof sessionStorage === 'undefined') return;
	sessionStorage.removeItem(recordsAccessStorageKey(providerId, patientId));
}

/** Server marks successful records fetches with this flag. */
export function isValidRecordsPayload(body) {
	return Boolean(
		body &&
			body.records_access_granted === true &&
			Array.isArray(body.health_records) &&
			Array.isArray(body.onboarding_steps),
	);
}
