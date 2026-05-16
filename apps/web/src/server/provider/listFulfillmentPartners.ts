import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getAppointmentCatalog } from '@/server/admin/appointmentReferenceService';

export type FulfillmentPartnerKind = 'pharmacy' | 'laboratory';

const KIND_TO_SLUG: Record<FulfillmentPartnerKind, string> = {
	pharmacy: 'pharmacy',
	laboratory: 'laboratory',
};

/** Onboarded pharmacy or laboratory orgs bookable in the patient catalog. */
export async function listFulfillmentPartners(kind: FulfillmentPartnerKind) {
	const targetSlug = KIND_TO_SLUG[kind];
	const catalog = await getAppointmentCatalog();
	const items = catalog.providers
		.filter((p) => p.specialty_slug === targetSlug)
		.map((p) => ({
			id: p.id,
			name: p.provider_name || p.name || 'Provider',
			address: p.address || null,
		}))
		.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
	return items;
}

export async function isBookableFulfillmentOrg(orgId: string, kind: FulfillmentPartnerKind): Promise<boolean> {
	const partners = await listFulfillmentPartners(kind);
	return partners.some((p) => p.id === orgId);
}

export async function fulfillmentOrgKind(orgId: string): Promise<FulfillmentPartnerKind | null> {
	const sb = getSupabaseAdmin();
	const { data: prov } = await sb
		.from('providers')
		.select('id, type, specialty')
		.eq('id', orgId)
		.maybeSingle();
	if (!prov) return null;
	const catalog = await getAppointmentCatalog();
	const match = catalog.providers.find((p) => p.id === orgId);
	if (!match?.specialty_slug) return null;
	if (match.specialty_slug === 'pharmacy') return 'pharmacy';
	if (match.specialty_slug === 'laboratory') return 'laboratory';
	return null;
}
