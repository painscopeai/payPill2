import { createClient } from '@supabase/supabase-js';

let cached;

function resolveSupabaseProjectUrl() {
	const raw =
		process.env.SUPABASE_URL?.trim() ||
		process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
		process.env.VITE_SUPABASE_URL?.trim();
	if (!raw) return null;
	try {
		const stripped = raw.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
		const base = new URL(stripped);
		return base.origin;
	} catch {
		return null;
	}
}

/**
 * Service-role Supabase client (server only). Bypasses RLS; enforce authorization in route/middleware.
 */
export function getSupabaseAdmin() {
	if (cached) return cached;
	const url = resolveSupabaseProjectUrl();
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
	if (!url || !key) {
		throw new Error(
			'Missing SUPABASE_SERVICE_ROLE_KEY or project URL (set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL)',
		);
	}
	cached = createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
	return cached;
}
