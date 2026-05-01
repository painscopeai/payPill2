import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { dispatchFromNextRequest } from '@/server/api/dispatchLegacyApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Matches AdminSidebar analytics items → `/api/analytics/<segment>`. */
const ALLOWED = new Set([
	'financial',
	'subscriptions',
	'patients',
	'employers',
	'insurance',
	'providers',
	'ai',
	'forms',
]);

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ segment: string }> },
) {
	const { segment } = await context.params;
	if (!ALLOWED.has(segment)) {
		return NextResponse.json({ error: 'Unknown analytics segment' }, { status: 404 });
	}
	return dispatchFromNextRequest(request, 'GET');
}
