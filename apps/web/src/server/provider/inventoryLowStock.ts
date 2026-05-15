import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Create in-app notifications for all provider staff when an item is at or below threshold.
 * v1: may notify on every qualifying event (no deduplication).
 */
export async function notifyLowStockIfNeeded(
	sb: SupabaseClient,
	providerOrgId: string,
	drugCatalogIds: string[],
): Promise<void> {
	const ids = [...new Set(drugCatalogIds.filter(Boolean))];
	if (!ids.length) return;

	const { data: drugs, error: dErr } = await sb
		.from('provider_drug_catalog')
		.select('id, name, quantity_on_hand, low_stock_threshold')
		.in('id', ids)
		.eq('provider_org_id', providerOrgId);
	if (dErr || !drugs?.length) return;

	const low = drugs.filter(
		(d) =>
			d.low_stock_threshold != null &&
			typeof d.quantity_on_hand === 'number' &&
			d.quantity_on_hand <= (d.low_stock_threshold as number),
	);
	if (!low.length) return;

	const { data: staffRaw, error: sErr } = await sb
		.from('profiles')
		.select('id, status')
		.eq('provider_org_id', providerOrgId)
		.eq('role', 'provider');
	if (sErr || !staffRaw?.length) return;

	const staff = staffRaw.filter((p) => String(p.status || 'active').toLowerCase() !== 'inactive');
	if (!staff.length) return;

	const rows = staff.flatMap((user) =>
		low.map((d) => ({
			user_id: user.id as string,
			title: 'Low stock alert',
			body: `${d.name}: ${d.quantity_on_hand} unit(s) on hand (threshold ${d.low_stock_threshold}).`,
			category: 'inventory_low_stock',
			link: '/provider/settings/catalog/drugs',
		})),
	);
	await sb.from('notifications').insert(rows);
}
