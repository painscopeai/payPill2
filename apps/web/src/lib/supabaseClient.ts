import { createClient } from '@supabase/supabase-js';

/**
 * Must use literal `process.env.NEXT_PUBLIC_*` keys here — Next.js only inlines
 * public env at build time when the property access is static (not `process.env[name]`).
 */
const url =
	process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
	process.env.VITE_SUPABASE_URL?.trim() ||
	'https://env-not-configured.invalid';
const anonKey =
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
	process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
	'sb-placeholder-anon-key-not-configured';

export const configured = Boolean(
	(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim()) &&
		(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim()),
);

if (!configured) {
	console.warn(
		'[supabaseClient] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. Auth against Supabase is disabled until configured.',
	);
}

export const supabase = createClient(url, anonKey, {
	auth: {
		persistSession: configured,
		autoRefreshToken: configured,
		detectSessionInUrl: configured,
	},
});

export const isSupabaseConfigured = configured;

export default supabase;
