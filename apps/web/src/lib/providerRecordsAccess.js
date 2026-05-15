const STORAGE_PREFIX = 'paypill_provider_records_';

export function recordsAccessStorageKey(patientId) {
	return `${STORAGE_PREFIX}${patientId}`;
}

/** @returns {string | null} */
export function readStoredRecordsToken(patientId) {
	if (!patientId || typeof sessionStorage === 'undefined') return null;
	try {
		const token = sessionStorage.getItem(recordsAccessStorageKey(patientId));
		if (!token) return null;
		const payload = JSON.parse(atob(token.split('.')[1]));
		if (!payload?.exp || payload.exp * 1000 <= Date.now()) {
			sessionStorage.removeItem(recordsAccessStorageKey(patientId));
			return null;
		}
		return token;
	} catch {
		return null;
	}
}

export function storeRecordsToken(patientId, token) {
	if (!patientId || !token || typeof sessionStorage === 'undefined') return;
	sessionStorage.setItem(recordsAccessStorageKey(patientId), token);
}

export function clearRecordsToken(patientId) {
	if (!patientId || typeof sessionStorage === 'undefined') return;
	sessionStorage.removeItem(recordsAccessStorageKey(patientId));
}
