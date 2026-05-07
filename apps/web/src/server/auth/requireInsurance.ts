import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export type InsuranceContext = {
	insuranceId: string;
	email: string | null;
};

export async function requireInsurance(
	request: NextRequest,
): Promise<InsuranceContext | NextResponse> {
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
		.select('id, email, role, status')
		.eq('id', uid)
		.maybeSingle();
	if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
	if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
	if (profile.role !== 'insurance') {
		return NextResponse.json({ error: 'Insurance role required' }, { status: 403 });
	}
	if ((profile.status || '').toLowerCase() === 'inactive') {
		return NextResponse.json({ error: 'Insurance profile inactive' }, { status: 403 });
	}
	return {
		insuranceId: uid,
		email: (profile.email as string) || userData.user.email || null,
	};
}
