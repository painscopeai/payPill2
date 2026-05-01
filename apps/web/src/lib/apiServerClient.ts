import { getApiBaseUrl, warnIfApiLikelyBroken } from '@/lib/apiBaseUrl';
import { supabase } from '@/lib/supabaseClient';
import { withTimeout } from '@/lib/withTimeout';

warnIfApiLikelyBroken();

/** Stay under typical gateway/serverless limits so the UI does not spin forever. */
const FETCH_TIMEOUT_MS = 28_000;
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
		} finally {
			clearTimeout(timeoutId);
		}
	},
};

export default apiServerClient;

export { apiServerClient };
