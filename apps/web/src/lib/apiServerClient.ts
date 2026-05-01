import { getApiBaseUrl, warnIfApiLikelyBroken } from '@/lib/apiBaseUrl';

warnIfApiLikelyBroken();

const apiServerClient = {
	fetch: async (url: string, options: RequestInit = {}) => {
		const base = getApiBaseUrl();
		const path = url.startsWith('/') ? url : `/${url}`;
		return await window.fetch(`${base}${path}`, options);
	},
};

export default apiServerClient;

export { apiServerClient };
