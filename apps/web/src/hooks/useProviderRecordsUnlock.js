import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { RECORDS_UNLOCK_MS } from '@/lib/providerRecordsAccess';

const EXPIRED_MSG = 'Records access expired. Re-enter your password to continue.';

/**
 * Records unlock for a single patient chart visit.
 * - Locked again after 30 minutes on this screen.
 * - Locked when the provider navigates away (hook unmounts or patient id changes).
 */
export function useProviderRecordsUnlock(patientId) {
	const [unlockedAt, setUnlockedAt] = useState(null);
	const [expiresAt, setExpiresAt] = useState(null);
	const timerRef = useRef(null);

	const clearTimer = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const lock = useCallback(
		({ notify = false } = {}) => {
			clearTimer();
			setUnlockedAt(null);
			setExpiresAt(null);
			if (notify) toast.info(EXPIRED_MSG);
		},
		[clearTimer],
	);

	const unlock = useCallback(() => {
		clearTimer();
		const now = Date.now();
		const exp = now + RECORDS_UNLOCK_MS;
		setUnlockedAt(now);
		setExpiresAt(exp);
		toast.success('Records unlocked for 30 minutes.');
		return exp;
	}, [clearTimer]);

	const isUnlocked = Boolean(unlockedAt && expiresAt && expiresAt > Date.now());

	useEffect(() => {
		if (!expiresAt || !unlockedAt) return;
		const remaining = expiresAt - Date.now();
		if (remaining <= 0) {
			lock({ notify: true });
			return;
		}
		timerRef.current = setTimeout(() => lock({ notify: true }), remaining);
		return clearTimer;
	}, [expiresAt, unlockedAt, lock, clearTimer]);

	// Drop legacy sessionStorage unlocks (no longer persisted across navigation).
	useEffect(() => {
		try {
			for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
				const key = sessionStorage.key(i);
				if (key?.startsWith('paypill_records_unlock_')) sessionStorage.removeItem(key);
			}
		} catch {
			/* private mode */
		}
	}, []);

	useEffect(() => {
		lock();
		return () => lock();
	}, [patientId, lock]);

	return {
		isUnlocked,
		unlock,
		lock,
	};
}
