import type { SupabaseClient } from '@supabase/supabase-js';

export type OperationsProfile = 'doctor' | 'pharmacist' | 'laboratory';

export async function resolveOperationsProfileForTypeSlug(
	sb: SupabaseClient,
	typeSlug: string,
): Promise<OperationsProfile | null> {
	const slug = typeSlug.trim().toLowerCase();
	if (!slug) return null;
	const { data: typeRow, error } = await sb
		.from('provider_types')
		.select('operations_profile, active')
		.eq('slug', slug)
		.maybeSingle();
	if (error) throw error;
	if (!typeRow || typeRow.active === false) return null;
	const profile = String(typeRow.operations_profile || 'doctor') as OperationsProfile;
	if (profile === 'doctor' || profile === 'pharmacist' || profile === 'laboratory') return profile;
	return 'doctor';
}

/**
 * Set providers.type and sync providers.practice_role_id from provider_types.operations_profile.
 */
export async function syncPracticeRoleFromProviderType(
	sb: SupabaseClient,
	providerOrgId: string,
	typeSlug: string,
): Promise<{ type: string; practice_role_id: string | null }> {
	const slug = typeSlug.trim().toLowerCase();
	if (!slug) {
		throw Object.assign(new Error('provider type slug is required'), { status: 400 });
	}

	const operationsProfile = await resolveOperationsProfileForTypeSlug(sb, slug);
	if (!operationsProfile) {
		throw Object.assign(new Error('provider type not found or inactive'), { status: 400 });
	}

	const { data: role, error: roleErr } = await sb
		.from('provider_practice_roles')
		.select('id')
		.eq('slug', operationsProfile)
		.eq('active', true)
		.maybeSingle();
	if (roleErr) throw roleErr;
	if (!role?.id) {
		throw Object.assign(new Error(`practice role missing for operations profile: ${operationsProfile}`), {
			status: 500,
		});
	}

	const { data: row, error: upErr } = await sb
		.from('providers')
		.update({
			type: slug,
			practice_role_id: role.id,
			updated_at: new Date().toISOString(),
		})
		.eq('id', providerOrgId)
		.select('type, practice_role_id')
		.single();
	if (upErr) throw upErr;

	return {
		type: String(row.type),
		practice_role_id: (row.practice_role_id as string) || null,
	};
}
