import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { validateAllSteps } from '@/server/express-api/utils/validation.js';
import { internalApiUrlFromRequest } from '@/server/http/internalApiUrlFromRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
	const userId = await getBearerUserId(request);
	if (!userId) {
		return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { allData } = body as { allData?: unknown };

	if (!allData || typeof allData !== 'object') {
		return NextResponse.json(
			{ error: 'Missing required field: allData (must be an object)' },
			{ status: 400 },
		);
	}

	const validation = validateAllSteps(allData as Record<string, unknown>, { criticalOnly: true }) as {
		valid: boolean;
		errors: Record<string, string[]>;
	};
	if (!validation.valid) {
		return NextResponse.json({ error: 'Validation failed for one or more steps', errors: validation.errors }, { status: 400 });
	}

	const completedAt = new Date().toISOString();
	const sb = getSupabaseAdmin();

	const { error: profileErr } = await sb
		.from('profiles')
		.update({
			onboarding_completed: true,
			onboarding_completed_at: completedAt,
			updated_at: completedAt,
		})
		.eq('id', userId);

	if (profileErr) {
		console.error('[onboarding] complete profile update failed:', profileErr.message);
		return NextResponse.json({ error: 'Failed to finalize onboarding' }, { status: 500 });
	}

	let recommendationsGenerated = 0;
	const auth = request.headers.get('authorization') || '';
	try {
		const url = internalApiUrlFromRequest(request, '/clinical-ai-webhook');
		const recommendationResponse = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(auth ? { Authorization: auth } : {}),
			},
			body: JSON.stringify({ fireAndForget: true }),
			signal: AbortSignal.timeout(25_000),
		});

		if (recommendationResponse.ok && recommendationResponse.status === 202) {
			recommendationsGenerated = 0;
		} else if (!recommendationResponse.ok) {
			console.warn(`[onboarding] clinical-ai-webhook returned ${recommendationResponse.status}`);
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.warn('[onboarding] Failed to queue AI webhook:', msg);
	}

	return NextResponse.json({
		success: true,
		message: 'Onboarding completed successfully',
		recommendations_generated: recommendationsGenerated,
		completed_at: completedAt,
	});
}
