import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { fetchAppointmentsForPracticeOrg } from '@/server/provider/fetchAppointmentsForPracticeOrg';

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

	const { rows, error } = await fetchAppointmentsForPracticeOrg(sb, ctx.providerOrgId, '*', {
		limitDirect: 500,
		limitService: 500,
	});

	if (error) {
		console.error('[api/provider/appointments]', error);
		return NextResponse.json({ error: 'Failed to load appointments' }, { status: 500 });
	}

	const rowsSorted = [...(rows || [])].sort((a, b) => {
		const ra = a as {
			appointment_date?: string;
			appointment_time?: string;
			created_at?: string;
			updated_at?: string;
		};
		const rb = b as {
			appointment_date?: string;
			appointment_time?: string;
			created_at?: string;
			updated_at?: string;
		};
		const da = String(ra.appointment_date || '');
		const db = String(rb.appointment_date || '');
		if (da !== db) return db.localeCompare(da);
		const ta = String(ra.appointment_time || '');
		const tb = String(rb.appointment_time || '');
		if (ta !== tb) return tb.localeCompare(ta);
		const ca = String(ra.created_at || ra.updated_at || '');
		const cb = String(rb.created_at || rb.updated_at || '');
		return cb.localeCompare(ca);
	});

	const userIds = Array.from(new Set(rowsSorted.map((r: { user_id?: string | null }) => r.user_id).filter(Boolean)));
	let profileById = new Map<string, { first_name?: string | null; last_name?: string | null; email?: string | null }>();
	if (userIds.length) {
		const { data: profs } = await sb.from('profiles').select('id, first_name, last_name, email').in('id', userIds as string[]);
		profileById = new Map((profs || []).map((p: { id: string }) => [p.id, p]));
	}

	const items = rowsSorted.map((raw) => {
		const apt = raw as { id: string; user_id?: string | null };
		const p = apt.user_id ? profileById.get(apt.user_id) : undefined;
		const patientName =
			p?.first_name || p?.last_name
				? [p?.first_name, p?.last_name].filter(Boolean).join(' ')
				: p?.email || apt.user_id || 'Patient';
		return { ...raw, patient_name: patientName };
	});

	return NextResponse.json({ items });
}
