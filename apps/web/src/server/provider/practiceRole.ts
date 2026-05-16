import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveOperationsProfileForTypeSlug } from '@/server/provider/syncPracticeRoleFromProviderType';

export function isPharmacyPracticeRole(slug: string | null | undefined): boolean {
	return slug === 'pharmacist';
}

/** Provider specialty slugs that should get pharmacy inventory (catalog + stock). */
export function isPharmacyProviderTypeSlug(slug: string | null | undefined): boolean {
	if (!slug) return false;
	const s = String(slug).trim().toLowerCase();
	return s === 'pharmacy' || s === 'pharmacist' || s.includes('pharmacy');
}

export function resolveIsPharmacyAccess(input: {
	practiceRoleSlug?: string | null;
	operationsProfile?: string | null;
	providerTypeSlug?: string | null;
	providerTypeLabel?: string | null;
}): boolean {
	if (isPharmacyPracticeRole(input.practiceRoleSlug)) return true;
	if (input.operationsProfile === 'pharmacist') return true;
	if (isPharmacyProviderTypeSlug(input.providerTypeSlug)) return true;
	const label = input.providerTypeLabel?.trim().toLowerCase() || '';
	return label.includes('pharmacy');
}

export type PharmacyAccessContext = {
	practiceRoleSlug: string | null;
	operationsProfile: string | null;
	providerTypeSlug: string | null;
	providerTypeLabel: string | null;
	isPharmacy: boolean;
};

/** Unified pharmacy gating for provider APIs and portal UI. */
export async function getPharmacyAccessForOrg(
	sb: SupabaseClient,
	providerOrgId: string | null,
): Promise<PharmacyAccessContext> {
	const empty: PharmacyAccessContext = {
		practiceRoleSlug: null,
		operationsProfile: null,
		providerTypeSlug: null,
		providerTypeLabel: null,
		isPharmacy: false,
	};
	if (!providerOrgId) return empty;

	const practiceRoleSlug = await getPracticeRoleSlugForOrg(sb, providerOrgId);

	let providerTypeSlug: string | null = null;
	let providerTypeLabel: string | null = null;
	let operationsProfile: string | null = practiceRoleSlug;

	const { data: org } = await sb.from('providers').select('type').eq('id', providerOrgId).maybeSingle();
	if (org?.type) {
		providerTypeSlug = String(org.type).trim().toLowerCase();
		const { data: typeRow } = await sb
			.from('provider_types')
			.select('label, operations_profile')
			.eq('slug', providerTypeSlug)
			.maybeSingle();
		if (typeRow?.label) providerTypeLabel = String(typeRow.label);
		if (typeRow?.operations_profile) {
			operationsProfile = String(typeRow.operations_profile);
		} else {
			try {
				const resolved = await resolveOperationsProfileForTypeSlug(sb, providerTypeSlug);
				if (resolved) operationsProfile = resolved;
			} catch {
				// operations_profile column may be missing before migration
				if (isPharmacyProviderTypeSlug(providerTypeSlug)) operationsProfile = 'pharmacist';
			}
		}
	}

	const isPharmacy = resolveIsPharmacyAccess({
		practiceRoleSlug,
		operationsProfile,
		providerTypeSlug,
		providerTypeLabel,
	});

	return {
		practiceRoleSlug,
		operationsProfile,
		providerTypeSlug,
		providerTypeLabel,
		isPharmacy,
	};
}

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
		if (isPharmacyProviderTypeSlug(typeSlug)) return 'pharmacist';
		try {
			const profile = await resolveOperationsProfileForTypeSlug(sb, typeSlug);
			if (profile) return profile;
		} catch {
			// Fall through when provider_types.operations_profile is not migrated yet
		}
	}

	return null;
}
