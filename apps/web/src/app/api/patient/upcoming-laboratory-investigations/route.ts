import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { buildUpcomingLaboratoryInvestigations } from '@/server/patient/buildUpcomingLaboratoryInvestigations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/patient/upcoming-laboratory-investigations — dashboard lab card. */
export async function GET(request: NextRequest) {
	void request;
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const items = await buildUpcomingLaboratoryInvestigations(uid);
		return NextResponse.json({ items });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to load laboratory investigations';
		console.error('[api/patient/upcoming-laboratory-investigations]', msg);
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
