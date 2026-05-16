import { useCallback, useEffect, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeProviderPortalProfile } from '@/lib/providerPortalConfig.js';

function isPharmacySpecialtyHint(slug, label) {
	const s = (slug || '').trim().toLowerCase();
	if (s === 'pharmacy' || s === 'pharmacist' || s.includes('pharmacy')) return true;
	const l = (label || '').trim().toLowerCase();
	return l.includes('pharmacy');
}

/**
 * Practice org context for provider portal (operational profile, nav, feature gating).
 */
export function useProviderPracticeContext() {
	const { user } = useAuth();
	const [state, setState] = useState({
		loading: true,
		providerOrgId: null,
		practiceRoleSlug: null,
		operationsProfile: null,
		providerTypeSlug: null,
		providerTypeLabel: null,
		portalProfile: 'doctor',
		isPharmacy: false,
		isLaboratory: false,
		isClinical: true,
	});

	const refresh = useCallback(async () => {
		setState((s) => ({ ...s, loading: true }));
		try {
			const res = await apiServerClient.fetch('/provider/practice-context');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load practice context');
			const providerTypeSlug = body.provider_type_slug || null;
			const providerTypeLabel = body.provider_type_label || null;
			const operationsProfile = body.operations_profile || null;
			const practiceRoleSlug = body.practice_role_slug || null;
			const isPharmacy =
				body.is_pharmacy === true ||
				isPharmacySpecialtyHint(providerTypeSlug, providerTypeLabel) ||
				isPharmacySpecialtyHint(null, user?.specialty);
			const isLaboratory = body.is_laboratory === true || operationsProfile === 'laboratory';
			const portalProfile = normalizeProviderPortalProfile(operationsProfile, practiceRoleSlug, isPharmacy);
			setState({
				loading: false,
				providerOrgId: body.provider_org_id || null,
				practiceRoleSlug,
				operationsProfile,
				providerTypeSlug,
				providerTypeLabel,
				portalProfile,
				isPharmacy: portalProfile === 'pharmacist',
				isLaboratory: portalProfile === 'laboratory',
				isClinical: portalProfile === 'doctor',
			});
		} catch {
			const fallbackPharmacy = isPharmacySpecialtyHint(null, user?.specialty);
			const portalProfile = normalizeProviderPortalProfile(null, null, fallbackPharmacy);
			setState({
				loading: false,
				providerOrgId: user?.provider_org_id || null,
				practiceRoleSlug: null,
				operationsProfile: null,
				providerTypeSlug: null,
				providerTypeLabel: user?.specialty || null,
				portalProfile,
				isPharmacy: portalProfile === 'pharmacist',
				isLaboratory: portalProfile === 'laboratory',
				isClinical: portalProfile === 'doctor',
			});
		}
	}, [user?.provider_org_id, user?.specialty]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { ...state, refresh };
}
