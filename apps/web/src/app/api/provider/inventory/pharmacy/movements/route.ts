import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getPharmacyAccessForOrg } from '@/server/provider/practiceRole';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/inventory/pharmacy/movements — recent stock ledger for pharmacy practices. */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	const orgId = ctx.providerOrgId;
	if (!orgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const access = await getPharmacyAccessForOrg(sb, orgId);
	if (!access.isPharmacy) {
		return NextResponse.json({ error: 'Pharmacy inventory is only available for pharmacy practices.' }, { status: 403 });
	}

	const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 50));

	const { data, error } = await sb
		.from('provider_pharmacy_stock_movements')
		.select(
			'id, drug_catalog_id, delta_qty, reason, notes, created_at, provider_drug_catalog ( id, name )',
		)
		.eq('provider_org_id', orgId)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const items = (data || []).map((row: Record<string, unknown>) => {
		const drug = row.provider_drug_catalog as { id?: string; name?: string } | null;
		return {
			id: row.id,
			drug_catalog_id: row.drug_catalog_id,
			drug_name: drug?.name || '—',
			delta_qty: row.delta_qty,
			reason: row.reason,
			notes: row.notes,
			created_at: row.created_at,
		};
	});

	return NextResponse.json({ items });
}
