import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageUsersAdmin } from '@/server/auth/requireManageUsersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { auditLog } from '@/server/express-api/middleware/rbac.js';
import { parseSpreadsheetBuffer, validateHeadersForKind, type BulkImportResult } from '@/server/bulk/parseSpreadsheet';
import type { RowFailure } from '@/server/bulk/parseSpreadsheet';
import { assertEmployerImportTarget } from '@/server/admin/employerAccountsAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
	const ctx = await requireManageUsersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
	}

	const employerId = String(formData.get('employerId') ?? '').trim();
	if (!employerId) {
		return NextResponse.json({ error: 'employerId is required (employer profile UUID).' }, { status: 400 });
	}

	const file = formData.get('file');
	if (!file || typeof file === 'string') {
		return NextResponse.json({ error: 'file is required' }, { status: 400 });
	}
	const blob = file as Blob;
	if (blob.size > MAX_BYTES) {
		return NextResponse.json({ error: 'File too large (max 10MB).' }, { status: 400 });
	}
	const filename = 'name' in file && typeof (file as File).name === 'string' ? (file as File).name : 'upload.csv';
	const buf = Buffer.from(await blob.arrayBuffer());

	const parsed = parseSpreadsheetBuffer(buf, filename);
	const hv = validateHeadersForKind('employees', parsed.headers);
	if (!hv.ok) {
		return NextResponse.json({ error: hv.error }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const employerCheck = await assertEmployerImportTarget(sb, employerId);
	if (!employerCheck.ok) {
		return NextResponse.json({ error: employerCheck.message }, { status: 400 });
	}

	const failures: RowFailure[] = [];
	let successCount = 0;
	let rowNumber = 1;

	/** Ban until admin approval (cleared with `ban_duration: 'none'` on approve). */
	const DRAFT_BAN_DURATION = '876000h';

	for (const row of parsed.rows) {
		rowNumber++;
		const email = String(row.email ?? '').trim();
		const password = String(row.password ?? '');
		const first_name = String(row.first_name ?? '').trim();
		const last_name = String(row.last_name ?? '').trim();
		const department = String(row.department ?? '').trim() || null;
		const hire_raw = String(row.hire_date ?? '').trim();

		if (!email || !EMAIL_RE.test(email)) {
			failures.push({ rowNumber, message: 'Invalid or missing email' });
			continue;
		}
		if (!password || password.length < 8) {
			failures.push({ rowNumber, message: 'Password must be at least 8 characters' });
			continue;
		}
		if (!first_name || !last_name) {
			failures.push({ rowNumber, message: 'first_name and last_name are required' });
			continue;
		}

		let hire_date: string | null = null;
		if (hire_raw) {
			const d = new Date(hire_raw);
			if (Number.isFinite(d.getTime())) {
				hire_date = hire_raw.slice(0, 10);
			}
			// Invalid or unparsable hire_date is skipped (column is optional).
		}

		const { data: existingProf } = await sb.from('profiles').select('id').eq('email', email).maybeSingle();
		if (existingProf) {
			failures.push({ rowNumber, message: 'Email already registered' });
			continue;
		}

		const { data: created, error: cuErr } = await sb.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: {
				role: 'individual',
				first_name,
				last_name,
				must_change_password: true,
				employee_import: true,
			},
		});

		if (cuErr || !created?.user?.id) {
			failures.push({
				rowNumber,
				message: cuErr?.message || 'Failed to create user',
			});
			continue;
		}

		const uid = created.user.id;

		// Omit insurance_option_slug: some DBs lack this column until migrations run; Postgres stores NULL for the column when it exists.
		const { data: insertedRow, error: insEE } = await sb
			.from('employer_employees')
			.insert({
				employer_id: employerId,
				user_id: uid,
				email,
				first_name,
				last_name,
				department,
				hire_date,
				status: 'draft',
			})
			.select('id')
			.maybeSingle();

		if (insEE || !insertedRow?.id) {
			failures.push({ rowNumber, message: insEE?.message || 'Failed to save employee row' });
			await sb.auth.admin.deleteUser(uid);
			continue;
		}

		const { error: banErr } = await sb.auth.admin.updateUserById(uid, {
			ban_duration: DRAFT_BAN_DURATION,
		});

		if (banErr) {
			failures.push({
				rowNumber,
				message: banErr.message || 'Failed to restrict login until approval',
			});
			await sb.from('employer_employees').delete().eq('id', insertedRow.id);
			await sb.auth.admin.deleteUser(uid);
			continue;
		}

		const { error: pendErr } = await sb.from('employer_employee_pending_passwords').insert({
			employer_employee_id: insertedRow.id,
			plaintext_password: password,
		});

		if (pendErr) {
			failures.push({
				rowNumber,
				message: pendErr.message || 'Failed to save credentials for roster approval',
			});
			await sb.from('employer_employees').delete().eq('id', insertedRow.id);
			await sb.auth.admin.deleteUser(uid);
			continue;
		}

		successCount++;
	}

	const result: BulkImportResult = { successCount, failures };

	await auditLog({
		adminId: ctx.adminId,
		action: 'BULK_IMPORT_EMPLOYEES',
		resourceType: 'employer_employees',
		resourceId: employerId,
		changes: { successCount, failureCount: failures.length },
		ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	});

	return NextResponse.json(result);
}
