import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Appointments for a practice directory org: rows where `appointments.provider_id` matches the org,
 * plus rows booked against any `provider_services` row owned by that org (covers mismatched `provider_id` on legacy rows).
 */
export async function fetchAppointmentsForPracticeOrg(
	sb: SupabaseClient,
	providerOrgId: string,
	selectColumns: string,
	options?: { limitDirect?: number; limitService?: number },
): Promise<{ rows: Record<string, unknown>[]; error: string | null }> {
	const limitDirect = options?.limitDirect ?? 2000;
	const limitService = options?.limitService ?? 2000;
	const aptById = new Map<string, Record<string, unknown>>();

	const { data: direct, error: dErr } = await sb
		.from('appointments')
		.select(selectColumns)
		.eq('provider_id', providerOrgId)
		.limit(limitDirect);
	if (dErr) {
		return { rows: [], error: dErr.message };
	}
	for (const r of direct || []) {
		const id = (r as { id?: string }).id;
		if (id) aptById.set(id, r as Record<string, unknown>);
	}

	const { data: svcIdRows, error: svcErr } = await sb
		.from('provider_services')
		.select('id')
		.eq('provider_id', providerOrgId);
	if (svcErr) {
		console.warn('[fetchAppointmentsForPracticeOrg] provider_services', svcErr.message);
		return { rows: [...aptById.values()], error: null };
	}
	const serviceIds = (svcIdRows || []).map((x: { id: string }) => x.id).filter(Boolean);
	if (!serviceIds.length) {
		return { rows: [...aptById.values()], error: null };
	}

	const { data: viaService, error: svcAptErr } = await sb
		.from('appointments')
		.select(selectColumns)
		.in('provider_service_id', serviceIds)
		.limit(limitService);
	if (svcAptErr) {
		console.warn('[fetchAppointmentsForPracticeOrg] appointments via service', svcAptErr.message);
		return { rows: [...aptById.values()], error: null };
	}
	for (const r of viaService || []) {
		const id = (r as { id?: string }).id;
		if (id && !aptById.has(id)) aptById.set(id, r as Record<string, unknown>);
	}

	return { rows: [...aptById.values()], error: null };
}
