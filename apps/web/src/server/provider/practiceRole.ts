import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveOperationsProfileForTypeSlug } from '@/server/provider/syncPracticeRoleFromProviderType';

/** Slug from `provider_practice_roles` for the org's linked `providers` row, or null. */
export async function getPracticeRoleSlugForOrg(
	sb: SupabaseClient,
	providerOrgId: string | null,
): Promise<string | null> {
	if (!providerOrgId) return null;
	const { data: row, error } = await sb
		.from('providers')
		.select('practice_role_id, type')
		.eq('id', providerOrgId)
		.maybeSingle();
	if (error || !row) return null;

	if (row.practice_role_id) {
		const { data: role } = await sb
			.from('provider_practice_roles')
			.select('slug')
			.eq('id', row.practice_role_id as string)
			.eq('active', true)
			.maybeSingle();
		if (role?.slug) return String(role.slug);
	}

	const typeSlug = row.type ? String(row.type).trim().toLowerCase() : '';
	if (typeSlug) {
		const profile = await resolveOperationsProfileForTypeSlug(sb, typeSlug);
		if (profile) return profile;
	}

	return null;
}

export function isPharmacyPracticeRole(slug: string | null | undefined): boolean {
	return slug === 'pharmacist';
}
