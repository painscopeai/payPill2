const UNLOCK_MS = 30 * 60 * 1000; // 30 minutes

function unlockKey(providerId, patientId) {
	return `paypill_records_unlock_${providerId || 'unknown'}_${patientId}`;
}

/** Whether this provider unlocked Records for this patient within the last 30 minutes. */
export function isRecordsUnlocked(providerId, patientId) {
	if (!providerId || !patientId || typeof sessionStorage === 'undefined') return false;
	try {
		const raw = sessionStorage.getItem(unlockKey(providerId, patientId));
		if (!raw) return false;
		const { exp } = JSON.parse(raw);
		if (!exp || exp <= Date.now()) {
			sessionStorage.removeItem(unlockKey(providerId, patientId));
			return false;
		}
		return true;
	} catch {
		return false;
	}
}

export function storeRecordsUnlock(providerId, patientId) {
	if (!providerId || !patientId || typeof sessionStorage === 'undefined') return;
	sessionStorage.setItem(
		unlockKey(providerId, patientId),
		JSON.stringify({ exp: Date.now() + UNLOCK_MS }),
	);
}

export function clearRecordsUnlock(providerId, patientId) {
	if (!providerId || !patientId || typeof sessionStorage === 'undefined') return;
	sessionStorage.removeItem(unlockKey(providerId, patientId));
}
