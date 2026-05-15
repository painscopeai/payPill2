import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * First active provider profile linked to the practice org (for automated invoices).
 * Deterministic: oldest `created_at` first.
 */
export async function resolveBillingProviderUserId(
	sb: SupabaseClient,
	providerOrgId: string,
): Promise<string | null> {
	const { data, error } = await sb
		.from('profiles')
		.select('id, status, created_at')
		.eq('provider_org_id', providerOrgId)
		.eq('role', 'provider')
		.order('created_at', { ascending: true })
		.limit(20);
	if (error || !data?.length) return null;
	const active = data.find((p) => String(p.status || 'active').toLowerCase() !== 'inactive');
	return (active?.id as string) || null;
}
