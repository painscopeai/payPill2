import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { supabase } from '@/lib/supabaseClient';

function apiUrl(path) {
	const base = getApiBaseUrl();
	const p = path.startsWith('/') ? path : `/${path}`;
	return `${base}${p}`;
}

async function authHeaders(extra) {
	const headers = new Headers(extra);
	if (!headers.has('Authorization')) {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (session?.access_token) {
			headers.set('Authorization', `Bearer ${session.access_token}`);
		}
	}
	return headers;
}

const integratedAiClient = {
	fetch: async (path, options = {}) => {
		const headers = await authHeaders(options.headers);
		const response = await window.fetch(apiUrl(path), {
			...options,
			headers,
		});

		if (!response.ok) {
			const errorBody = await response.text();
			throw new Error(`Request failed (${response.status}): ${errorBody}`);
		}

		return response.json();
	},

	stream: async (path, { body, signal, images } = {}) => {
		const headers = await authHeaders({
			Accept: 'text/event-stream',
		});

		const formData = new FormData();
		formData.append('message', JSON.stringify(body.message));

		(images || []).forEach((image) => {
			formData.append('images', image);
		});

		const response = await window.fetch(apiUrl(path), {
			method: 'POST',
			headers,
			body: formData,
			signal,
		});

		if (!response.ok) {
			const errorBody = await response.text();
			throw new Error(`Request failed (${response.status}): ${errorBody}`);
		}

		if (!response.body) {
			throw new Error('No response body');
		}

		return response;
	},
};

export default integratedAiClient;

export { integratedAiClient };
