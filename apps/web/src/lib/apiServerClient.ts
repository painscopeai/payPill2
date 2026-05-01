import { getApiBaseUrl, warnIfApiLikelyBroken } from '@/lib/apiBaseUrl';
import { supabase } from '@/lib/supabaseClient';

warnIfApiLikelyBroken();

const apiServerClient = {
	fetch: async (url: string, options: RequestInit = {}) => {
		const base = getApiBaseUrl();
		const path = url.startsWith('/') ? url : `/${url}`;
		const headers = new Headers(options.headers ?? undefined);
		if (!headers.has('Authorization')) {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (session?.access_token) {
				headers.set('Authorization', `Bearer ${session.access_token}`);
			}
		}
		return await window.fetch(`${base}${path}`, { ...options, headers });
	},
};

export default apiServerClient;

export { apiServerClient };
