import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getProviderPortalAccess } from '@/server/provider/providerPortalAccess';
import { enrichQueueItemsWithPatients, type ServiceQueueRow } from '@/server/provider/serviceQueueHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/service-queue — pharmacy or lab fulfillment queue for this portal profile. */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const sb = getSupabaseAdmin();
	const access = await getProviderPortalAccess(sb, ctx.providerOrgId);
	const routedTo = access.isPharmacy ? 'pharmacist' : access.isLaboratory ? 'laboratory' : null;

	if (!routedTo) {
		return NextResponse.json({
			items: [],
			message: 'Service queue is only available for pharmacy and laboratory portals.',
		});
	}

	const url = new URL(request.url);
	const status = url.searchParams.get('status') || 'pending';
	const statuses =
		status === 'all' ? ['pending', 'in_progress', 'completed'] : status === 'open' ? ['pending', 'in_progress'] : [status];

	const { data, error } = await sb
		.from('provider_service_queue_items')
		.select('*')
		.eq('routed_to', routedTo)
		.in('status', statuses)
		.order('created_at', { ascending: false })
		.limit(200);

	if (error) {
		if (/does not exist|schema cache/i.test(error.message)) {
			return NextResponse.json({
				items: [],
				message: 'Apply migration 20260623100000_provider_service_queue.sql on your database.',
			});
		}
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const items = await enrichQueueItemsWithPatients(sb, (data || []) as ServiceQueueRow[]);
	return NextResponse.json({ items, routed_to: routedTo });
}
