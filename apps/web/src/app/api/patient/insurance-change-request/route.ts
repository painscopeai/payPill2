import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — current walk-in / individual insurance coverage (and any legacy pending request).
 * POST — apply insurance change immediately on the patient profile (no insurer approval).
 */
export async function GET(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const sb = getSupabaseAdmin();

	const { data: prof, error: pErr } = await sb
		.from('profiles')
		.select(
			'id, role, primary_insurance_user_id, insurance_member_id, patient_coverage_source, first_name, last_name',
		)
		.eq('id', uid)
		.maybeSingle();
	if (pErr || !prof) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

	const p = prof as {
		role: string;
		primary_insurance_user_id: string | null;
		insurance_member_id: string | null;
		patient_coverage_source: string | null;
	};

	const { data: roster } = await sb
		.from('employer_employees')
		.select('id, employer_id, insurance_option_slug, status')
		.eq('user_id', uid)
		.in('status', ['active', 'pending', 'draft'])
		.not('insurance_option_slug', 'is', null)
		.limit(1)
		.maybeSingle();

	const isEmployee = Boolean(roster);

	let insurance_org: { id: string; display_name: string } | null = null;
	if (p.primary_insurance_user_id) {
		const { data: org } = await sb
			.from('profiles')
			.select('id, company_name, name, email')
			.eq('id', p.primary_insurance_user_id)
			.eq('role', 'insurance')
			.maybeSingle();
		const o = org as { id: string; company_name: string | null; name: string | null; email: string | null } | null;
		if (o) {
			const display_name =
				String(o.company_name || '').trim() ||
				String(o.name || '').trim() ||
				String(o.email || '').trim() ||
				'Insurance';
			insurance_org = { id: o.id, display_name };
		}
	}

	const { data: pending } = await sb
		.from('patient_insurance_change_requests')
		.select('id, status, requested_insurance_user_id, requested_member_id, created_at, reviewer_note')
		.eq('patient_user_id', uid)
		.eq('status', 'pending')
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	let pending_with_org = null as null | Record<string, unknown>;
	if (pending) {
		const pr = pending as { requested_insurance_user_id: string };
		const { data: rqOrg } = await sb
			.from('profiles')
			.select('id, company_name, name, email')
			.eq('id', pr.requested_insurance_user_id)
			.maybeSingle();
		const ro = rqOrg as { company_name?: string | null; name?: string | null; email?: string | null } | null;
		const dn =
			String(ro?.company_name || '').trim() ||
			String(ro?.name || '').trim() ||
			String(ro?.email || '').trim() ||
			'Insurance';
		pending_with_org = { ...(pending as object), requested_insurance_display_name: dn };
	}

	return NextResponse.json({
		is_employee: isEmployee,
		primary_insurance_user_id: p.primary_insurance_user_id,
		insurance_member_id: p.insurance_member_id,
		patient_coverage_source: p.patient_coverage_source,
		insurance_org,
		pending_request: pending_with_org,
	});
}

export async function POST(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const sb = getSupabaseAdmin();

	const { data: roster } = await sb
		.from('employer_employees')
		.select('id')
		.eq('user_id', uid)
		.in('status', ['active', 'pending', 'draft'])
		.not('insurance_option_slug', 'is', null)
		.limit(1)
		.maybeSingle();

	if (roster) {
		return NextResponse.json(
			{ error: 'Employer-assigned insurance cannot be changed here. Contact your employer or HR.' },
			{ status: 400 },
		);
	}

	let body: { requested_insurance_user_id?: string; requested_member_id?: string };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const reqIns = String(body.requested_insurance_user_id || '').trim();
	const reqMem = String(body.requested_member_id || '').trim();
	if (!reqIns || !reqMem) {
		return NextResponse.json(
			{ error: 'requested_insurance_user_id and requested_member_id are required' },
			{ status: 400 },
		);
	}

	const { data: org } = await sb
		.from('profiles')
		.select('id, role, status')
		.eq('id', reqIns)
		.maybeSingle();
	const orgRow = org as { id: string; role: string; status: string | null } | null;
	if (
		!orgRow ||
		orgRow.role !== 'insurance' ||
		String(orgRow.status || 'active').toLowerCase() === 'inactive'
	) {
		return NextResponse.json({ error: 'Invalid insurance organization' }, { status: 400 });
	}

	const { error: profErr } = await sb
		.from('profiles')
		.update({
			primary_insurance_user_id: reqIns,
			insurance_member_id: reqMem,
			patient_coverage_source: 'walk_in',
		})
		.eq('id', uid);

	if (profErr) {
		console.error('[patient/insurance-change-request] profile update', profErr.message);
		return NextResponse.json({ error: profErr.message }, { status: 500 });
	}

	const now = new Date().toISOString();
	const { error: clearErr } = await sb
		.from('patient_insurance_change_requests')
		.update({
			status: 'rejected',
			reviewed_at: now,
			reviewer_note: 'Superseded by patient self-service update',
		})
		.eq('patient_user_id', uid)
		.eq('status', 'pending');

	if (clearErr) {
		console.warn('[patient/insurance-change-request] clear pending', clearErr.message);
	}

	return NextResponse.json({ success: true, applied: true });
}
