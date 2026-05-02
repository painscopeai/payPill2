import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Native list handler — reliable on Vercel (avoids legacy tinyhttp + node-mocks-http hang).
 * GET /api/appointments?user_id=<uuid> — only returns rows for the authenticated user.
 */
export async function GET(request: NextRequest) {
	const userId = await getBearerUserId(request);
	if (!userId) {
		return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
	}

	const url = new URL(request.url);
	const reqUser = url.searchParams.get('user_id')?.trim();
	if (!reqUser) {
		return NextResponse.json({ error: 'Missing user_id query parameter' }, { status: 400 });
	}
	if (reqUser !== userId) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const sb = getSupabaseAdmin();
	const { data: appointments, error } = await sb
		.from('appointments')
		.select('*')
		.eq('user_id', userId)
		.order('appointment_date', { ascending: false });

	if (error) {
		console.error('[api/appointments] list', error.message);
		return NextResponse.json({ error: 'Failed to list appointments' }, { status: 500 });
	}

	const list = (appointments || []) as Record<string, unknown>[];
	const withProviders = await Promise.all(
		list.map(async (apt: Record<string, unknown>) => {
			const pid = apt.provider_id;
			if (!pid || typeof pid !== 'string') return apt;
			const { data: prov } = await sb.from('providers').select('*').eq('id', pid).maybeSingle();
			return { ...apt, provider_details: prov || null };
		}),
	);

	return NextResponse.json(withProviders);
}
