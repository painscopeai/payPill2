import type { SupabaseClient } from '@supabase/supabase-js';

export const PROVIDER_PORTAL_FORM_TYPES = ['consent', 'service_intake'] as const;
export type ProviderPortalFormType = (typeof PROVIDER_PORTAL_FORM_TYPES)[number];

export type ProviderOwnedFormRow = {
	id: string;
	form_type: string;
	owner_scope: string;
	owner_profile_id: string | null;
	status: string;
	name?: string;
};

export function isProviderPortalFormType(ft: string): ft is ProviderPortalFormType {
	return (PROVIDER_PORTAL_FORM_TYPES as readonly string[]).includes(ft);
}

export async function getProviderOwnedForm(
	sb: SupabaseClient,
	profileId: string,
	formId: string,
): Promise<ProviderOwnedFormRow | null> {
	const { data, error } = await sb
		.from('forms')
		.select('id, form_type, owner_scope, owner_profile_id, status, name')
		.eq('id', formId)
		.maybeSingle();
	if (error) throw error;
	const row = data as ProviderOwnedFormRow | null;
	if (!row || row.owner_scope !== 'provider' || row.owner_profile_id !== profileId) return null;
	return row;
}
