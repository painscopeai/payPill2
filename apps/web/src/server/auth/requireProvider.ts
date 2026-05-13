import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export type ProviderContext = {
	/** Logged-in profile id (role provider or admin). */
	userId: string;
	/** Linked directory org for appointments/booking; null until onboarding links a row in `public.providers`. */
	providerOrgId: string | null;
	email: string | null;
	providerOnboardingCompleted: boolean;
};

/**
 * Bearer JWT + profiles.role in ('provider','admin'). Admin may call provider APIs for support.
 */
export async function requireProvider(request: NextRequest): Promise<ProviderContext | NextResponse> {
	const authHeader = request.headers.get('authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
	}
	const jwt = authHeader.slice(7).trim();
	const sb = getSupabaseAdmin();
	const { data: userData, error: authErr } = await sb.auth.getUser(jwt);
	if (authErr || !userData?.user?.id) {
		return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
	}
	const uid = userData.user.id;

	const { data: profile, error: profErr } = await sb
		.from('profiles')
		.select('id, email, role, status, provider_org_id, provider_onboarding_completed')
		.eq('id', uid)
		.maybeSingle();
	if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
	if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 });

	const role = String(profile.role || '');
	if (role !== 'provider' && role !== 'admin') {
		return NextResponse.json({ error: 'Provider role required' }, { status: 403 });
	}

	if ((profile.status || '').toLowerCase() === 'inactive') {
		return NextResponse.json({ error: 'Profile inactive' }, { status: 403 });
	}

	return {
		userId: uid,
		providerOrgId: (profile.provider_org_id as string | null) ?? null,
		email: (profile.email as string) || userData.user.email || null,
		providerOnboardingCompleted: profile.provider_onboarding_completed === true,
	};
}
