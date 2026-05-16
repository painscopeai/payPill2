import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { listPendingFulfillmentForPatient } from '@/server/patient/pendingFulfillment';
import type { FulfillmentPartnerKind } from '@/server/provider/listFulfillmentPartners';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/patient/pending-fulfillment?kind=pharmacy|laboratory */
export async function GET(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const url = new URL(request.url);
	const kind = url.searchParams.get('kind') as FulfillmentPartnerKind | null;
	if (kind !== 'pharmacy' && kind !== 'laboratory') {
		return NextResponse.json({ error: 'kind must be pharmacy or laboratory' }, { status: 400 });
	}

	try {
		const sb = getSupabaseAdmin();
		const items = await listPendingFulfillmentForPatient(sb, uid, kind);
		return NextResponse.json({ items, kind });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to load pending orders';
		console.error('[api/patient/pending-fulfillment GET]', msg);
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
