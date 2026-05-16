import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getProviderPortalAccess } from '@/server/provider/providerPortalAccess';
import {
	listFulfillmentPartners,
	type FulfillmentPartnerKind,
} from '@/server/provider/listFulfillmentPartners';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/fulfillment-partners?kind=pharmacy|laboratory */
export async function GET(request: NextRequest) {
	const auth = await requireProvider(request);
	if (auth instanceof NextResponse) return auth;
	if (!auth.providerOrgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const access = await getProviderPortalAccess(sb, auth.providerOrgId);
	if (!access.isClinical) {
		return NextResponse.json({ error: 'Only clinical practices can list fulfillment partners.' }, { status: 403 });
	}

	const url = new URL(request.url);
	const kind = url.searchParams.get('kind') as FulfillmentPartnerKind | null;
	if (kind !== 'pharmacy' && kind !== 'laboratory') {
		return NextResponse.json({ error: 'kind must be pharmacy or laboratory' }, { status: 400 });
	}

	try {
		const items = await listFulfillmentPartners(kind);
		return NextResponse.json({ items, kind });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to load partners';
		console.error('[api/provider/fulfillment-partners]', msg);
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
