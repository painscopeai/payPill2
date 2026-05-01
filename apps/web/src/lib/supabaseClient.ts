import { createClient } from '@supabase/supabase-js';

function env(name: string): string | undefined {
	if (typeof process === 'undefined') return undefined;
	return process.env[name]?.trim();
}

const url =
	env('NEXT_PUBLIC_SUPABASE_URL') ||
	env('VITE_SUPABASE_URL') ||
	'https://env-not-configured.invalid';
const anonKey =
	env('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
	env('VITE_SUPABASE_ANON_KEY') ||
	'sb-placeholder-anon-key-not-configured';

export const configured = Boolean(
	(env('NEXT_PUBLIC_SUPABASE_URL') || env('VITE_SUPABASE_URL')) &&
		(env('NEXT_PUBLIC_SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY')),
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
