import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import {
	buildStructuredPatientOverview,
	type RawOnboardingRow,
} from '@/server/patient-health/buildStructuredPatientOverview';

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

	const sb = getSupabaseAdmin();

	const [profileRes, stepsRes, recordsRes] = await Promise.all([
		sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
		sb
			.from('patient_onboarding_steps')
			.select('step, data, created_at, updated_at')
			.eq('user_id', userId)
			.order('step', { ascending: true }),
		sb
			.from('patient_health_records')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.limit(200),
	]);

	const errors: string[] = [];
	if (profileRes.error) errors.push(`profile: ${profileRes.error.message}`);
	if (stepsRes.error) errors.push(`onboarding_steps: ${stepsRes.error.message}`);
	if (recordsRes.error) errors.push(`health_records: ${recordsRes.error.message}`);

	if (errors.length > 0) {
		console.error('[patient-health-overview]', errors.join('; '));
		return NextResponse.json(
			{ error: 'Failed to load one or more data sources', details: errors },
			{ status: 500 },
		);
	}

	const onboardingSteps = stepsRes.data ?? [];
	const healthRecords = recordsRes.data ?? [];
	const fetchedAt = new Date().toISOString();

	const profile = (profileRes.data ?? null) as Record<string, unknown> | null;
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
