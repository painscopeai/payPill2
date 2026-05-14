import type { SupabaseClient } from '@supabase/supabase-js';

const excludedAppointmentStatuses = new Set(['cancelled', 'canceled', 'no_show', 'no-show']);

function appointmentOpen(status: string | null | undefined): boolean {
	const s = String(status || '').toLowerCase();
	return !excludedAppointmentStatuses.has(s);
}

/**
 * True when a provider user may exchange secure messages with this patient
 * (registered relationship, or at least one non-cancelled appointment with the provider org).
 */
export async function clinicalMessagingAllowed(
	sb: SupabaseClient,
	providerUserId: string,
	patientUserId: string,
): Promise<boolean> {
	const { data: rel } = await sb
		.from('patient_provider_relationships')
		.select('id')
		.eq('provider_id', providerUserId)
		.eq('patient_id', patientUserId)
		.maybeSingle();
	if (rel) return true;

	const { data: prov } = await sb.from('profiles').select('provider_org_id').eq('id', providerUserId).maybeSingle();
	const orgId = (prov?.provider_org_id as string | null | undefined) ?? null;
	if (!orgId) return false;

	const { data: byOrg } = await sb
		.from('appointments')
		.select('id, status')
		.eq('user_id', patientUserId)
		.eq('provider_id', orgId)
		.limit(80);
	if (byOrg?.some((a) => appointmentOpen(a.status as string | null))) return true;

	const { data: svcRows } = await sb.from('provider_services').select('id').eq('provider_id', orgId).limit(500);
	const svcIds = (svcRows || []).map((r: { id: string }) => r.id).filter(Boolean);
	if (!svcIds.length) return false;

	const { data: bySvc } = await sb
		.from('appointments')
		.select('id, status')
		.eq('user_id', patientUserId)
		.in('provider_service_id', svcIds)
		.limit(80);

	return Boolean(bySvc?.some((a) => appointmentOpen(a.status as string | null)));
}
