import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { buildAnalyticsPayload } from '@/server/analytics/analyticsPayloads';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Pro / Fluid: raise if dashboard segment queries need more headroom; pair with Vercel function logs + Server-Timing. */
export const maxDuration = 300;

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

	const url = new URL(request.url);
	const query: Record<string, string> = {};
	url.searchParams.forEach((value, key) => {
		query[key] = value;
	});

	const t0 = Date.now();
	let tAdmin = t0;
	let tPayloadStart = t0;
	try {
		getSupabaseAdmin();
		tAdmin = Date.now();
		tPayloadStart = Date.now();
		const data = await buildAnalyticsPayload(segment, query);
		const tDone = Date.now();
		const adminMs = tAdmin - t0;
		const payloadMs = tDone - tPayloadStart;
		const totalMs = tDone - t0;
		console.info(
			JSON.stringify({
				msg: 'analytics.timing',
				segment,
				adminInitMs: adminMs,
				payloadMs,
				totalMs,
			}),
		);
		const res = NextResponse.json(data);
		res.headers.set(
			'Server-Timing',
			`admin-init;dur=${adminMs}, payload;dur=${payloadMs}, total;dur=${totalMs}`,
		);
		return res;
	} catch (e: unknown) {
		const err = e as { code?: string; message?: string };
		if (err?.code === 'NOT_FOUND') {
			return NextResponse.json({ error: 'Unknown analytics segment' }, { status: 404 });
		}
		return NextResponse.json({ error: err?.message || 'Analytics error' }, { status: 500 });
	}
}
