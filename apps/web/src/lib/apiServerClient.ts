import { getApiBaseUrl, warnIfApiLikelyBroken } from '@/lib/apiBaseUrl';
import { supabase } from '@/lib/supabaseClient';
import { withTimeout } from '@/lib/withTimeout';

warnIfApiLikelyBroken();

/** Cold serverless + admin APIs can exceed short limits; configurable via env (default 120s). */
const FETCH_TIMEOUT_MS = Math.min(
	600_000,
	Math.max(10_000, Number(process.env.NEXT_PUBLIC_API_FETCH_TIMEOUT_MS) || 120_000),
);
const SESSION_WAIT_MS = 8_000;

export type ApiServerFetchOptions = RequestInit & {
	/** Override AbortController deadline for long-running routes (e.g. AI generation). */
	timeoutMs?: number;
};

const apiServerClient = {
	fetch: async (url: string, options: ApiServerFetchOptions = {}) => {
		const { timeoutMs, ...fetchRest } = options;
		const deadlineMs =
			typeof timeoutMs === 'number' && timeoutMs > 0
				? Math.min(600_000, timeoutMs)
				: FETCH_TIMEOUT_MS;

		const base = getApiBaseUrl();
		const path = url.startsWith('/') ? url : `/${url}`;
		const headers = new Headers(fetchRest.headers ?? undefined);
		if (!headers.has('Authorization')) {
			try {
				const {
					data: { session },
				} = await withTimeout(supabase.auth.getSession(), SESSION_WAIT_MS, 'Auth session');
				if (session?.access_token) {
					headers.set('Authorization', `Bearer ${session.access_token}`);
				}
			} catch {
				/* proceed without bearer — caller may get 401 */
			}
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), deadlineMs);
		try {
			return await window.fetch(`${base}${path}`, { ...fetchRest, headers, signal: controller.signal });
		} catch (e: unknown) {
			if (e instanceof DOMException && e.name === 'AbortError') {
				throw new Error(`Request timed out after ${deadlineMs / 1000}s. Try again.`);
			}
			throw e;
		} finally {
			clearTimeout(timeoutId);
		}
	},
};

export default apiServerClient;

export { apiServerClient };
