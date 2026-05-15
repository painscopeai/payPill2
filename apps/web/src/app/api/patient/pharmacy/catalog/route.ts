import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getPracticeRoleSlugForOrg } from '@/server/provider/practiceRole';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/patient/pharmacy/catalog?provider_org_id=
 * In-stock, sellable items for a pharmacist practice (patient-facing).
 */
export async function GET(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const orgId = String(new URL(request.url).searchParams.get('provider_org_id') || '').trim();
	if (!orgId) return NextResponse.json({ error: 'provider_org_id is required' }, { status: 400 });

	const sb = getSupabaseAdmin();
	const slug = await getPracticeRoleSlugForOrg(sb, orgId);
	if (slug !== 'pharmacist') {
		return NextResponse.json({ error: 'Not a pharmacy practice' }, { status: 404 });
	}

	const { data, error } = await sb
		.from('provider_drug_catalog')
		.select('id, name, default_strength, unit_price, currency, quantity_on_hand')
		.eq('provider_org_id', orgId)
		.eq('is_active', true)
		.gt('quantity_on_hand', 0)
		.gt('unit_price', 0)
		.order('name', { ascending: true })
		.limit(2000);

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ items: data || [] });
}
