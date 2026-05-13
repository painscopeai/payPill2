import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/claims — payer claims visible to the practice (placeholder until payer integrations land). */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;
	return NextResponse.json({
		items: [],
		note: 'Insurance claim feeds will appear here when linked to your practice.',
	});
}
