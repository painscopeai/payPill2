import { getApiBaseUrl, warnIfApiLikelyBroken } from '@/lib/apiBaseUrl';
import { supabase } from '@/lib/supabaseClient';
import { withTimeout } from '@/lib/withTimeout';

warnIfApiLikelyBroken();

/** Cold serverless + admin APIs can exceed short limits; keep under typical Vercel max. */
const FETCH_TIMEOUT_MS = 60_000;
const SESSION_WAIT_MS = 8_000;

const apiServerClient = {
	fetch: async (url: string, options: RequestInit = {}) => {
		const base = getApiBaseUrl();
		const path = url.startsWith('/') ? url : `/${url}`;
		const headers = new Headers(options.headers ?? undefined);
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
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
		try {
			return await window.fetch(`${base}${path}`, { ...options, headers, signal: controller.signal });
		} catch (e: unknown) {
			if (e instanceof DOMException && e.name === 'AbortError') {
				throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s. Try again.`);
			}
			throw e;
		} finally {
			clearTimeout(timeoutId);
		}
	},
};

export default apiServerClient;

export { apiServerClient };
