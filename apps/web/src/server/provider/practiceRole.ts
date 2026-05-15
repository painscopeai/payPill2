import type { SupabaseClient } from '@supabase/supabase-js';

/** Slug from `provider_practice_roles` for the org's linked `providers` row, or null. */
export async function getPracticeRoleSlugForOrg(
	sb: SupabaseClient,
	providerOrgId: string | null,
): Promise<string | null> {
	if (!providerOrgId) return null;
	const { data: row, error } = await sb
		.from('providers')
		.select('practice_role_id')
		.eq('id', providerOrgId)
		.maybeSingle();
	if (error || !row?.practice_role_id) return null;
	const { data: role } = await sb
		.from('provider_practice_roles')
		.select('slug')
		.eq('id', row.practice_role_id as string)
		.eq('active', true)
		.maybeSingle();
	return role?.slug ? String(role.slug) : null;
}
