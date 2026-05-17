import type { SupabaseClient } from '@supabase/supabase-js';

function normalizeEmail(email: string | null | undefined): string {
	return String(email || '')
		.trim()
		.toLowerCase();
}

async function countServicesForOrg(sb: SupabaseClient, orgId: string): Promise<number> {
	const { count, error } = await sb
		.from('provider_services')
		.select('*', { count: 'exact', head: true })
		.eq('provider_id', orgId);
	if (error) return 0;
	return count ?? 0;
}

/** Find a directory org row that matches the provider user's email (admin-precreated practices). */
export async function findProviderOrgByEmail(
	sb: SupabaseClient,
	email: string | null | undefined,
): Promise<{ id: string; email: string | null } | null> {
	const norm = normalizeEmail(email);
	if (!norm) return null;

	const { data, error } = await sb
		.from('providers')
		.select('id, email, created_at')
		.ilike('email', norm)
		.order('created_at', { ascending: true })
		.limit(5);

	if (error) {
		console.error('[findProviderOrgByEmail]', error.message);
		return null;
	}

	const rows = (data || []) as { id: string; email?: string | null }[];
	if (!rows.length) return null;

	// Prefer the org that already has admin-created services.
	let best = rows[0];
	let bestCount = await countServicesForOrg(sb, best.id);
	for (const row of rows.slice(1)) {
		const c = await countServicesForOrg(sb, row.id);
		if (c > bestCount) {
			best = row;
			bestCount = c;
		}
	}
	return { id: best.id, email: best.email ?? null };
}

async function linkProfileToOrg(sb: SupabaseClient, userId: string, orgId: string): Promise<void> {
	const { error } = await sb
		.from('profiles')
		.update({ provider_org_id: orgId, updated_at: new Date().toISOString() })
		.eq('id', userId);
	if (error) console.error('[linkProfileToOrg]', error.message);
}

/**
 * Resolve the practice org id for a provider user. Links the profile to an existing
 * admin-created `providers` row (matched by email) when onboarding created a duplicate org.
 */
export async function resolveProviderOrgId(
	sb: SupabaseClient,
	opts: { userId: string; email: string | null | undefined; linkedOrgId: string | null | undefined },
): Promise<string | null> {
	const { userId, email } = opts;
	const linkedOrgId = opts.linkedOrgId?.trim() || null;

	const emailMatch = await findProviderOrgByEmail(sb, email);
	if (!emailMatch) return linkedOrgId;

	if (!linkedOrgId) {
		await linkProfileToOrg(sb, userId, emailMatch.id);
		return emailMatch.id;
	}

	if (linkedOrgId === emailMatch.id) return linkedOrgId;

	const linkedCount = await countServicesForOrg(sb, linkedOrgId);
	const emailMatchCount = await countServicesForOrg(sb, emailMatch.id);

	// Heal duplicate orgs: prefer the directory row that has admin catalog/services.
	if (emailMatchCount > linkedCount) {
		await linkProfileToOrg(sb, userId, emailMatch.id);
		return emailMatch.id;
	}

	return linkedOrgId;
}
