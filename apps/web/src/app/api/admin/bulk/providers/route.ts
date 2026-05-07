import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
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
const STATUSES = new Set(['pending', 'active', 'inactive']);

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
	const hv = validateHeadersForKind('providers', parsed.headers);
	if (!hv.ok) {
		return NextResponse.json({ error: hv.error }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
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
		const email = String(row.email ?? '').trim() || null;
		const phone = String(row.phone ?? '').trim() || null;
		const category = String(row.category ?? '').trim() || null;
		const specialty = String(row.specialty ?? '').trim() || null;
		const address = String(row.address ?? '').trim() || null;
		let status = String(row.status ?? '').trim().toLowerCase() || 'pending';
		if (!STATUSES.has(status)) status = 'pending';
		const telemedicine_available = parseBool(String(row.telemedicine_available ?? ''));

		const { error: insErr } = await sb.from('providers').insert({
			name,
			email,
			phone,
			category,
			specialty,
			address,
			status,
			telemedicine_available,
			provider_name: name,
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
		action: 'BULK_IMPORT_PROVIDERS',
		resourceType: 'providers',
		resourceId: null,
		changes: { successCount, failureCount: failures.length },
		ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	});

	return NextResponse.json(result);
}
