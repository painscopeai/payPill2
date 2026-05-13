import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/appointments — appointments for the provider's linked org (`profiles.provider_org_id`). */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;

	const sb = getSupabaseAdmin();
	if (!ctx.providerOrgId) {
		return NextResponse.json({ items: [], message: 'Link your practice in onboarding to see bookings.' });
	}

	const { data: rows, error } = await sb
		.from('appointments')
		.select('*')
		.eq('provider_id', ctx.providerOrgId)
		.order('appointment_date', { ascending: true })
		.limit(200);

	if (error) {
		console.error('[api/provider/appointments]', error.message);
		return NextResponse.json({ error: 'Failed to load appointments' }, { status: 500 });
	}

	const userIds = Array.from(new Set((rows || []).map((r: { user_id?: string | null }) => r.user_id).filter(Boolean)));
	let profileById = new Map<string, { first_name?: string | null; last_name?: string | null; email?: string | null }>();
	if (userIds.length) {
		const { data: profs } = await sb.from('profiles').select('id, first_name, last_name, email').in('id', userIds as string[]);
		profileById = new Map((profs || []).map((p: { id: string }) => [p.id, p]));
	}

	const items = (rows || []).map((apt: { user_id?: string | null; id: string }) => {
		const p = apt.user_id ? profileById.get(apt.user_id) : undefined;
		const patientName =
			p?.first_name || p?.last_name
				? [p?.first_name, p?.last_name].filter(Boolean).join(' ')
				: p?.email || apt.user_id || 'Patient';
		return { ...apt, patient_name: patientName };
	});

	return NextResponse.json({ items });
}
