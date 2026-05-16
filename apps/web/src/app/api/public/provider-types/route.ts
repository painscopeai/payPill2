import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { listProviderTypes } from '@/server/admin/providerTypeService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/public/provider-types — active specialties for provider signup (no auth). */
export async function GET(request: NextRequest) {
	void request;
	try {
		const items = await listProviderTypes(false);
		return NextResponse.json({
			items: items.map((t) => ({
				slug: t.slug,
				label: t.label,
			})),
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Server error';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
