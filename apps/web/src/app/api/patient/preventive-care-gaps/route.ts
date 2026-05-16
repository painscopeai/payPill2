import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { buildPreventiveCareGaps } from '@/server/patient/buildPreventiveCareGaps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/patient/preventive-care-gaps — actionable items from Supabase for the dashboard card. */
export async function GET(request: NextRequest) {
	void request;
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const items = await buildPreventiveCareGaps(uid);
		return NextResponse.json({ items });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to load preventive care gaps';
		console.error('[api/patient/preventive-care-gaps]', msg);
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
