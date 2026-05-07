import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { createInsuranceOption } from '@/server/admin/appointmentReferenceService';
import { auditLog } from '@/server/express-api/middleware/rbac.js';
import {
	parseSpreadsheetBuffer,
	validateHeadersForKind,
	type BulkImportResult,
	type RowFailure,
} from '@/server/bulk/parseSpreadsheet';
import { BULK_UPLOAD_MAX_BYTES } from '@/server/bulk/uploadLimits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function parseBool(s: string): boolean {
	const t = String(s ?? '').trim().toLowerCase();
	return t === 'true' || t === '1' || t === 'yes';
}

export async function POST(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
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
	const hv = validateHeadersForKind('insurance_options', parsed.headers);
	if (!hv.ok) {
		return NextResponse.json({ error: hv.error }, { status: 400 });
	}

	const failures: RowFailure[] = [];
	let successCount = 0;
	let rowNumber = 1;

	for (const row of parsed.rows) {
		rowNumber++;
		const slug = String(row.slug ?? '').trim();
		const label = String(row.label ?? '').trim();
		const sortRaw = String(row.sort_order ?? '').trim();
		const sort_order = sortRaw === '' ? 0 : Number.parseInt(sortRaw, 10);
		const active = parseBool(String(row.active ?? 'true'));
		const copayRaw = String(row.copay_estimate ?? '').trim();
		const copay_estimate =
			copayRaw === '' ? undefined : Number.parseFloat(copayRaw);

		if (!slug || !label) {
			failures.push({ rowNumber, message: 'slug and label are required' });
			continue;
		}
		if (!Number.isFinite(sort_order)) {
			failures.push({ rowNumber, message: 'sort_order must be a number' });
			continue;
		}
		if (copayRaw !== '' && !Number.isFinite(copay_estimate)) {
			failures.push({ rowNumber, message: 'copay_estimate must be a number' });
			continue;
		}

		try {
			await createInsuranceOption({
				slug,
				label,
				sort_order,
				active,
				copay_estimate: copayRaw === '' ? undefined : copay_estimate,
			});
			successCount++;
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Failed';
			failures.push({ rowNumber, message: msg });
		}
	}

	const result: BulkImportResult = { successCount, failures };

	await auditLog({
		adminId: ctx.adminId,
		action: 'BULK_IMPORT_INSURANCE_OPTIONS',
		resourceType: 'insurance_options',
		resourceId: null,
		changes: { successCount, failureCount: failures.length },
		ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	});

	return NextResponse.json(result);
}
