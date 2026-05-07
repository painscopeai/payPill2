import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageUsersAdmin } from '@/server/auth/requireManageUsersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { auditLog } from '@/server/express-api/middleware/rbac.js';
import {
	parseSpreadsheetBuffer,
	validateHeadersForKind,
	type BulkImportResult,
	type RowFailure,
} from '@/server/bulk/parseSpreadsheet';
import { assertEmployerImportTarget } from '@/server/admin/employerAccountsAdmin';
import { BULK_UPLOAD_MAX_BYTES } from '@/server/bulk/uploadLimits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
	const ctx = await requireManageUsersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
	}

	const employerUserId = String(formData.get('employerUserId') ?? '').trim();
	if (!employerUserId) {
		return NextResponse.json({ error: 'employerUserId is required (employer profile UUID).' }, { status: 400 });
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
	const hv = validateHeadersForKind('employer_contracts', parsed.headers);
	if (!hv.ok) {
		return NextResponse.json({ error: hv.error }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const employerCheck = await assertEmployerImportTarget(sb, employerUserId);
	if (!employerCheck.ok) {
		return NextResponse.json({ error: employerCheck.message }, { status: 400 });
	}

	const failures: RowFailure[] = [];
	let successCount = 0;
	let rowNumber = 1;

	for (const row of parsed.rows) {
		rowNumber++;
		const name = String(row.name ?? '').trim();
		if (!name) {
			failures.push({ rowNumber, message: 'name is required' });
			continue;
		}
		const effective_raw = String(row.effective_date ?? '').trim();
		let effective_date: string | null = null;
		if (effective_raw) {
			const d = new Date(effective_raw);
			if (Number.isFinite(d.getTime())) {
				effective_date = effective_raw.slice(0, 10);
			}
			// Unparsable effective_date is skipped (optional field).
		}
		const status = String(row.status ?? '').trim() || 'draft';
		const notes = String(row.notes ?? '').trim() || null;

		const { error: insErr } = await sb.from('employer_contracts').insert({
			employer_user_id: employerUserId,
			name,
			effective_date,
			status,
			notes,
		});
		if (insErr) {
			failures.push({ rowNumber, message: insErr.message });
			continue;
		}
		successCount++;
	}

	const result: BulkImportResult = { successCount, failures };

	await auditLog({
		adminId: ctx.adminId,
		action: 'BULK_IMPORT_EMPLOYER_CONTRACTS',
		resourceType: 'employer_contracts',
		resourceId: employerUserId,
		changes: { successCount, failureCount: failures.length },
		ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	});

	return NextResponse.json(result);
}
