import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireEmployer } from '@/server/auth/requireEmployer';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { isPendingPasswordTableUnavailableError } from '@/server/admin/pendingPasswordTable';
import { ensureEmployerInsuranceContract } from '@/server/contracts/employerContracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type ApproveBody = {
	ids?: string[];
	insurance_option_slug?: string | null;
};

type RowFail = { id: string; message: string };
type ShareCredential = { email: string; initialPassword: string };

type EmployerEmployeeApproveRow = {
	id: string;
	employer_id: string;
	user_id: string | null;
	email: string;
	status: string;
	insurance_option_slug: string | null;
};

async function validateInsuranceSlug(sb: ReturnType<typeof getSupabaseAdmin>, slug: string): Promise<boolean> {
	const [profileRes, legacyOptionRes] = await Promise.all([
		sb.from('profiles').select('id').eq('id', slug).eq('role', 'insurance').maybeSingle(),
		sb.from('insurance_options').select('slug').eq('slug', slug).maybeSingle(),
	]);
	return Boolean(profileRes.data || legacyOptionRes.data);
}

export async function PATCH(request: NextRequest) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: ApproveBody;
	try {
		body = (await request.json()) as ApproveBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id).trim()).filter(Boolean) : [];
	if (!ids.length) {
		return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
	}

	const rawInsurance = body.insurance_option_slug;
	if (!rawInsurance || typeof rawInsurance !== 'string' || !rawInsurance.trim()) {
		return NextResponse.json({ error: 'insurance_option_slug is required' }, { status: 400 });
	}
	const insurancePatch = rawInsurance.trim();

	const sb = getSupabaseAdmin();

	const insuranceOk = await validateInsuranceSlug(sb, insurancePatch);
	if (!insuranceOk) {
		return NextResponse.json({ error: `Unknown insurance_option_slug: ${insurancePatch}` }, { status: 400 });
	}

	const { data: pendingPwRows, error: pendingFetchErr } = await sb
		.from('employer_employee_pending_passwords')
		.select('employer_employee_id, plaintext_password')
		.in('employer_employee_id', ids);

	if (pendingFetchErr && !isPendingPasswordTableUnavailableError(pendingFetchErr)) {
		return NextResponse.json({ error: pendingFetchErr.message }, { status: 500 });
	}

	const pendingByEmployeeId = new Map<string, string>(
		pendingFetchErr && isPendingPasswordTableUnavailableError(pendingFetchErr)
			? []
			: (pendingPwRows ?? []).map((r: { employer_employee_id: string; plaintext_password: string }) => [
					r.employer_employee_id,
					r.plaintext_password,
				]),
	);

	const { data: rows, error: fetchErr } = await sb
		.from('employer_employees')
		.select('id, employer_id, user_id, email, status, insurance_option_slug')
		.eq('employer_id', ctx.employerId)
		.in('id', ids);
	if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

	const typedRows = (rows ?? []) as EmployerEmployeeApproveRow[];
	const byId = new Map(typedRows.map((r) => [r.id, r]));
	const failures: RowFail[] = [];
	const credentials: ShareCredential[] = [];
	let approvedCount = 0;

	for (const id of ids) {
		const row = byId.get(id);
		if (!row) {
			failures.push({ id, message: 'Roster row not found for this employer' });
			continue;
		}
		if (row.status !== 'draft') {
			failures.push({ id, message: `Not in draft status (current: ${row.status})` });
			continue;
		}
		if (!row.user_id) {
			failures.push({ id, message: 'Missing user_id' });
			continue;
		}

		const prevInsurance = row.insurance_option_slug ?? null;
		const nowIso = new Date().toISOString();

		const { error: upErr } = await sb
			.from('employer_employees')
			.update({
				status: 'active',
				approved_at: nowIso,
				approved_by: ctx.employerId,
				insurance_option_slug: insurancePatch,
			})
			.eq('id', id);
		if (upErr) {
			failures.push({ id, message: upErr.message || 'Failed to update roster row' });
			continue;
		}

		const { error: unbanErr } = await sb.auth.admin.updateUserById(row.user_id, {
			ban_duration: 'none',
		});
		if (unbanErr) {
			await sb
				.from('employer_employees')
				.update({
					status: 'draft',
					approved_at: null,
					approved_by: null,
					insurance_option_slug: prevInsurance,
				})
				.eq('id', id);
			failures.push({ id, message: unbanErr.message || 'Failed to unban user' });
			continue;
		}

		const sharePw = pendingByEmployeeId.get(id);
		if (sharePw) {
			await sb.from('employer_employee_pending_passwords').delete().eq('employer_employee_id', id);
			credentials.push({ email: row.email, initialPassword: sharePw });
		}

		approvedCount++;
	}

	if (approvedCount > 0) {
		await ensureEmployerInsuranceContract(sb, {
			employerId: ctx.employerId,
			insuranceId: insurancePatch,
		});
	}

	return NextResponse.json({ approvedCount, failures, credentials });
}
