import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageUsersAdmin } from '@/server/auth/requireManageUsersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { auditLog } from '@/server/express-api/middleware/rbac.js';
import { parseSpreadsheetBuffer, validateHeadersForKind, type BulkImportResult } from '@/server/bulk/parseSpreadsheet';
import type { RowFailure } from '@/server/bulk/parseSpreadsheet';
import { BULK_UPLOAD_MAX_BYTES } from '@/server/bulk/uploadLimits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_STATUS = new Set(['active', 'inactive', 'suspended', 'pending']);

export async function POST(request: NextRequest) {
	const ctx = await requireManageUsersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
	}

	const file = formData.get('file');
	if (!file || typeof file === 'string') {
		return NextResponse.json({ error: 'file is required' }, { status: 400 });
	}
	const blob = file as Blob;
	if (blob.size > BULK_UPLOAD_MAX_BYTES) {
		return NextResponse.json({ error: 'File too large (max 10MB).' }, { status: 400 });
	}
	const filename = 'name' in file && typeof (file as File).name === 'string' ? (file as File).name : 'upload.csv';
	const buf = Buffer.from(await blob.arrayBuffer());

	const parsed = parseSpreadsheetBuffer(buf, filename);
	const hv = validateHeadersForKind('insurance_users', parsed.headers);
	if (!hv.ok) {
		return NextResponse.json({ error: hv.error }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const failures: RowFailure[] = [];
	let successCount = 0;
	let rowNumber = 1;

	for (const row of parsed.rows) {
		rowNumber++;
		const email = String(row.email ?? '').trim().toLowerCase();
		const password = String(row.password ?? '');
		const company_name = String(row.company_name ?? '').trim();
		const phone = String(row.phone ?? '').trim() || null;
		const statusRaw = String(row.status ?? 'active').trim().toLowerCase() || 'active';
		const status = ALLOWED_STATUS.has(statusRaw) ? statusRaw : 'active';

		if (!email || !EMAIL_RE.test(email)) {
			failures.push({ rowNumber, message: 'Invalid or missing email' });
			continue;
		}
		if (!password || password.length < 8) {
			failures.push({ rowNumber, message: 'Password must be at least 8 characters' });
			continue;
		}
		if (!company_name) {
			failures.push({ rowNumber, message: 'company_name is required' });
			continue;
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
				role: 'insurance',
				company_name,
				must_change_password: true,
				insurance_bulk_import: true,
			},
		});

		if (cuErr || !created?.user?.id) {
			failures.push({ rowNumber, message: cuErr?.message || 'Failed to create user' });
			continue;
		}

		const uid = created.user.id;
		const { error: profErr } = await sb
			.from('profiles')
			.update({
				role: 'insurance',
				company_name,
				phone,
				status,
				updated_at: new Date().toISOString(),
			})
			.eq('id', uid);
		if (profErr) {
			failures.push({ rowNumber, message: profErr.message || 'Failed to update insurance profile' });
			await sb.auth.admin.deleteUser(uid);
			continue;
		}

		if (status === 'inactive' || status === 'suspended') {
			await sb.auth.admin.updateUserById(uid, { ban_duration: '876000h' });
		}

		successCount++;
	}

	const result: BulkImportResult = { successCount, failures };

	await auditLog({
		adminId: ctx.adminId,
		action: 'BULK_IMPORT_INSURANCE_USERS',
		resourceType: 'profiles',
		resourceId: null,
		changes: { role: 'insurance', successCount, failureCount: failures.length },
		ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	});

	return NextResponse.json(result);
}
