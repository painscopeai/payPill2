import { createClient } from '@supabase/supabase-js';

/**
 * Supabase requires non-empty URL + anon key at client creation time.
 * On Vercel, if VITE_* vars are missing from Project Settings, empty strings
 * would throw during import and produce a blank white page.
 */
const configured =
	Boolean(import.meta.env.VITE_SUPABASE_URL?.trim()) &&
	Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY?.trim());

const url =
	import.meta.env.VITE_SUPABASE_URL?.trim() ||
	'https://env-not-configured.invalid';
const anonKey =
	import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
	'sb-placeholder-anon-key-not-configured';

if (!configured) {
	console.warn(
		'[supabaseClient] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set (e.g. add them in Vercel → Settings → Environment Variables). Auth against Supabase is disabled until configured.',
	);
}

export const isSupabaseConfigured = configured;

export const supabase = createClient(url, anonKey, {
	auth: {
		persistSession: configured,
		autoRefreshToken: configured,
		detectSessionInUrl: configured,
	},
});

export default supabase;
