import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/onboarding — aggregate state for self-serve wizard */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;

	const sb = getSupabaseAdmin();

	const { data: profile, error: pErr } = await sb
		.from('profiles')
		.select('id, email, provider_org_id, provider_onboarding_completed, first_name, last_name, name, phone, specialty, npi')
		.eq('id', ctx.userId)
		.maybeSingle();
	if (pErr || !profile) {
		return NextResponse.json({ error: pErr?.message || 'Profile not found' }, { status: 500 });
	}

	let practice: Record<string, unknown> | null = null;
	if (profile.provider_org_id) {
		const { data: prov } = await sb.from('providers').select('*').eq('id', profile.provider_org_id).maybeSingle();
		practice = prov || null;
	}

	const services =
		profile.provider_org_id ?
			(await sb
				.from('provider_services')
				.select('id,name,category,unit,price,currency,notes,is_active,sort_order,provider_id,created_at,updated_at')
				.eq('provider_id', profile.provider_org_id as string)
				.order('sort_order', { ascending: true })
				.order('created_at', { ascending: true })).data || []
		: [];

	const { data: schedule } = await sb
		.from('provider_schedule_settings')
		.select('timezone, slot_duration_minutes, weekly_hours')
		.eq('provider_user_id', ctx.userId)
		.maybeSingle();

	return NextResponse.json({
		provider_onboarding_completed: profile.provider_onboarding_completed === true,
		profile: {
			email: profile.email,
			first_name: profile.first_name,
			last_name: profile.last_name,
			name: profile.name,
			phone: profile.phone,
			specialty: profile.specialty,
			npi: profile.npi,
		},
		practice,
		services,
		schedule: schedule || {
			timezone: 'UTC',
			slot_duration_minutes: 30,
			weekly_hours: {},
		},
	});
}
