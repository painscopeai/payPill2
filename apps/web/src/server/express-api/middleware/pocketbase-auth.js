/**
 * Legacy middleware: PocketBase-encoded sessions are no longer validated here.
 * Supabase Bearer tokens are handled by requireSupabaseUser / checkAuth / supabaseBearerUser.
 */
export async function pocketbaseAuth(_req, _res, next) {
	return next();
}
