import type { SupabaseClient } from '@supabase/supabase-js';
import { getPharmacyAccessForOrg } from '@/server/provider/practiceRole';
import { normalizeProviderPortalProfile } from '@/lib/providerPortalConfig';

export type ProviderPortalAccess = {
	portalProfile: 'doctor' | 'pharmacist' | 'laboratory';
	isClinical: boolean;
	isPharmacy: boolean;
	isLaboratory: boolean;
	canViewFullPatientRecords: boolean;
};

export async function getProviderPortalAccess(
	sb: SupabaseClient,
	providerOrgId: string | null,
): Promise<ProviderPortalAccess> {
	const access = await getPharmacyAccessForOrg(sb, providerOrgId);
	const portalProfile = normalizeProviderPortalProfile(
		access.operationsProfile,
		access.practiceRoleSlug,
		access.isPharmacy,
	);
	const isClinical = portalProfile === 'doctor';
	return {
		portalProfile,
		isClinical,
		isPharmacy: portalProfile === 'pharmacist',
		isLaboratory: portalProfile === 'laboratory',
		canViewFullPatientRecords: isClinical,
	};
}
