import { useCallback, useEffect, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';

/**
 * Practice org context for provider portal (specialty, pharmacy inventory access).
 */
export function useProviderPracticeContext() {
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
			setState({
				loading: false,
				providerOrgId: body.provider_org_id || null,
				practiceRoleSlug: body.practice_role_slug || null,
				operationsProfile: body.operations_profile || null,
				providerTypeSlug: body.provider_type_slug || null,
				providerTypeLabel: body.provider_type_label || null,
				isPharmacy: body.is_pharmacy === true,
			});
		} catch {
			setState({
				loading: false,
				providerOrgId: null,
				practiceRoleSlug: null,
				operationsProfile: null,
				providerTypeSlug: null,
				providerTypeLabel: null,
				isPharmacy: false,
			});
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { ...state, refresh };
}
