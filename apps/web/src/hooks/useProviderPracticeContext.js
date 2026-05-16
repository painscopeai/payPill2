import { useCallback, useEffect, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext';

function isPharmacySpecialtyHint(slug, label) {
	const s = (slug || '').trim().toLowerCase();
	if (s === 'pharmacy' || s === 'pharmacist' || s.includes('pharmacy')) return true;
	const l = (label || '').trim().toLowerCase();
	return l.includes('pharmacy');
}

/**
 * Practice org context for provider portal (specialty, pharmacy inventory access).
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
		isPharmacy: false,
	});

	const refresh = useCallback(async () => {
		setState((s) => ({ ...s, loading: true }));
		try {
			const res = await apiServerClient.fetch('/provider/practice-context');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load practice context');
			const providerTypeSlug = body.provider_type_slug || null;
			const providerTypeLabel = body.provider_type_label || null;
			const isPharmacy =
				body.is_pharmacy === true ||
				isPharmacySpecialtyHint(providerTypeSlug, providerTypeLabel) ||
				isPharmacySpecialtyHint(null, user?.specialty);
			setState({
				loading: false,
				providerOrgId: body.provider_org_id || null,
				practiceRoleSlug: body.practice_role_slug || null,
				operationsProfile: body.operations_profile || null,
				providerTypeSlug,
				providerTypeLabel,
				isPharmacy,
			});
		} catch {
			const fallbackPharmacy = isPharmacySpecialtyHint(null, user?.specialty);
			setState({
				loading: false,
				providerOrgId: user?.provider_org_id || null,
				practiceRoleSlug: null,
				operationsProfile: null,
				providerTypeSlug: null,
				providerTypeLabel: user?.specialty || null,
				isPharmacy: fallbackPharmacy,
			});
		}
	}, [user?.provider_org_id, user?.specialty]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { ...state, refresh };
}
