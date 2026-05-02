import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { dispatchFromNextRequest } from '@/server/api/dispatchLegacyApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Gemini generation can exceed default function limits; GET is fast. */
export const maxDuration = 120;

/**
 * GET — native Supabase (avoids tinyhttp + proxy-addr on cold paths).
 * POST — delegates to legacy handler (Gemini) until fully migrated.
 */
export async function GET(request: NextRequest) {
	const userId = await getBearerUserId(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('patient_recommendations')
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false })
		.limit(100);

	if (error) {
		console.error('[api/ai-recommendations] GET', error.message);
		return NextResponse.json({ error: 'Failed to load recommendations' }, { status: 500 });
	}

	return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
	return dispatchFromNextRequest(request, 'POST');
}
