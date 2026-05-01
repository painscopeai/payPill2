import { getApiBaseUrl, warnIfApiLikelyBroken } from '@/lib/apiBaseUrl.js';

warnIfApiLikelyBroken();

const apiServerClient = {
	fetch: async (url, options = {}) => {
		const base = getApiBaseUrl();
		const path = url.startsWith('/') ? url : `/${url}`;
		return await window.fetch(`${base}${path}`, options);
	},
};

export default apiServerClient;

export { apiServerClient };
