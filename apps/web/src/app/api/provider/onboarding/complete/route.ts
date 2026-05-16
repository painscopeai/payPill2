import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { validateWeeklyHours, weeklyHoursHasAnyWindow } from '@/server/provider/scheduleSettings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/provider/onboarding/complete */
export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;

	const sb = getSupabaseAdmin();

	const { data: profile, error: pErr } = await sb
		.from('profiles')
		.select('id, provider_org_id, provider_onboarding_completed')
		.eq('id', ctx.userId)
		.maybeSingle();

	if (pErr || !profile) {
		return NextResponse.json({ error: pErr?.message || 'Profile not found' }, { status: 500 });
	}

	if (profile.provider_onboarding_completed === true) {
		return NextResponse.json({ ok: true, already_complete: true });
	}

	const orgId = profile.provider_org_id as string | null | undefined;
	if (!orgId) {
		return NextResponse.json({ error: 'Practice must be saved before completing onboarding.' }, { status: 400 });
	}

	const { count, error: cErr } = await sb
		.from('provider_services')
		.select('id', { count: 'exact', head: true })
		.eq('provider_id', orgId)
		.eq('is_active', true);

	if (cErr) {
		console.error('[onboarding/complete] count services', cErr.message);
		return NextResponse.json({ error: 'Failed to validate services' }, { status: 500 });
	}

	if (!count || count < 1) {
		return NextResponse.json(
			{ error: 'Add at least one active service or drug with pricing before finishing.' },
			{ status: 400 },
		);
	}

	const { data: sched } = await sb
		.from('provider_schedule_settings')
		.select('weekly_hours')
		.eq('provider_user_id', ctx.userId)
		.maybeSingle();

	const weeklyRaw = sched?.weekly_hours ?? {};
	const whParsed = validateWeeklyHours(weeklyRaw);
	if (!whParsed.ok) {
		return NextResponse.json({ error: whParsed.error }, { status: 400 });
	}
	if (!weeklyHoursHasAnyWindow(whParsed.value)) {
		return NextResponse.json(
			{ error: 'Set weekly availability with at least one time window on one day.' },
			{ status: 400 },
		);
	}

	const { error: upErr } = await sb
		.from('profiles')
		.update({ provider_onboarding_completed: true, updated_at: new Date().toISOString() })
		.eq('id', ctx.userId);

	if (upErr) {
		console.error('[onboarding/complete] profile update', upErr.message);
		return NextResponse.json({ error: upErr.message }, { status: 500 });
	}

	const { error: provErr } = await sb
		.from('providers')
		.update({
			status: 'active',
			verification_status: 'verified',
			approved_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('id', orgId);

	if (provErr) {
		console.error('[onboarding/complete] provider status', provErr.message);
	}

	return NextResponse.json({ ok: true });
}
