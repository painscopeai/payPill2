import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function providerMayViewPatient(
	sb: SupabaseClient,
	providerUserId: string,
	providerOrgId: string | null,
	patientId: string,
): Promise<boolean> {
	const { data: rel } = await sb
		.from('patient_provider_relationships')
		.select('id')
		.eq('provider_id', providerUserId)
		.eq('patient_id', patientId)
		.maybeSingle();
	if (rel) return true;
	if (!providerOrgId) return false;
	const { data: apt } = await sb
		.from('appointments')
		.select('id')
		.eq('user_id', patientId)
		.eq('provider_id', providerOrgId)
		.limit(1)
		.maybeSingle();
	return Boolean(apt);
}

/**
 * POST — re-authenticate provider with account password to unlock patient Records tab (step-up).
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const authCtx = await requireProvider(request);
	if (authCtx instanceof NextResponse) return authCtx;

	const { id: patientId } = await ctx.params;
	if (!patientId) {
		return NextResponse.json({ error: 'Missing patient id' }, { status: 400 });
	}

	let body: { password?: string };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const password = String(body.password || '');
	if (!password) {
		return NextResponse.json({ error: 'Password is required' }, { status: 400 });
	}

	const email = authCtx.email?.trim();
	if (!email) {
		return NextResponse.json({ error: 'Provider email not found on profile' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const allowed = await providerMayViewPatient(sb, authCtx.userId, authCtx.providerOrgId, patientId);
	if (!allowed) {
		return NextResponse.json({ error: 'You do not have access to this patient' }, { status: 403 });
	}

	const { error: signInErr } = await sb.auth.signInWithPassword({ email, password });
	if (signInErr) {
		return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
	}

	return NextResponse.json({
		success: true,
		expires_in_seconds: 30 * 60,
	});
}
