import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageUsersAdmin } from '@/server/auth/requireManageUsersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { assertEmployerImportTarget } from '@/server/admin/employerAccountsAdmin';
import { listInsuranceOptions } from '@/server/admin/appointmentReferenceService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
	const ctx = await requireManageUsersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const employerId = String(url.searchParams.get('employerId') ?? '').trim();
	const status = String(url.searchParams.get('status') ?? '').trim();

	if (!employerId) {
		return NextResponse.json({ error: 'employerId query parameter is required' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const employerCheck = await assertEmployerImportTarget(sb, employerId);
	if (!employerCheck.ok) {
		return NextResponse.json({ error: employerCheck.message }, { status: 400 });
	}

	let q = sb
		.from('employer_employees')
		.select(
			'id, employer_id, user_id, email, first_name, last_name, department, hire_date, status, insurance_option_slug, approved_at, approved_by, created_at, updated_at',
		)
		.eq('employer_id', employerId)
		.order('created_at', { ascending: false });

	if (status) {
		q = q.eq('status', status);
	}

	const [{ data: items, error }, insuranceOptions] = await Promise.all([
		q,
		listInsuranceOptions(false),
	]);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({
		items: items ?? [],
		insuranceOptions: insuranceOptions.map((o) => ({
			slug: o.slug,
			label: o.label,
		})),
	});
}
