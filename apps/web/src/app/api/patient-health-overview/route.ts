import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import {
	buildStructuredPatientOverview,
	type RawOnboardingRow,
} from '@/server/patient-health/buildStructuredPatientOverview';
import { loadPatientHealthSources } from '@/server/patient-health/loadPatientHealthSources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Debug / transparency: returns the signed-in patient's normalized profile, onboarding steps,
 * and health records in one JSON body (`schemaVersion`, `counts`, `account`, sections…).
 * Optional `?includeRaw=1` adds `raw` with Supabase-shaped rows.
 */
export async function GET(request: NextRequest) {
	const userId = await getBearerUserId(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const includeRaw = request.nextUrl.searchParams.get('includeRaw') === '1';

	const loaded = await loadPatientHealthSources(userId);
	if (!loaded.ok) {
		console.error('[patient-health-overview]', loaded.errors.join('; '));
		return NextResponse.json(
			{ error: 'Failed to load one or more data sources', details: loaded.errors },
			{ status: 500 },
		);
	}

	const { profile, onboardingSteps, healthRecords } = loaded;
	const fetchedAt = new Date().toISOString();

	const structured = buildStructuredPatientOverview({
		userId,
		fetchedAt,
		profile,
		onboardingSteps: onboardingSteps as RawOnboardingRow[],
		healthRecords: (healthRecords ?? []) as Record<string, unknown>[],
	});

	/** Single response body: meta fields + sections + optional raw (no nested `overview`). */
	return NextResponse.json({
		...structured.meta,
		account: structured.account,
		demographics: structured.demographics,
		bodyMetrics: structured.bodyMetrics,
		conditions: structured.conditions,
		onboardingSteps: structured.onboardingSteps,
		healthRecords: structured.healthRecords,
		...(includeRaw
			? {
					raw: {
						profile,
						onboardingSteps,
						healthRecords,
					},
				}
			: {}),
	});
}
