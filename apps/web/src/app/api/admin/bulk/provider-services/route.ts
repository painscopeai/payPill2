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
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATEGORIES = new Set(['service', 'drug', 'other']);
const UNITS = new Set(['per_visit', 'per_dose', 'flat', 'monthly']);

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

	const providerId = String(formData.get('providerId') ?? '').trim();
	if (!providerId || !UUID_RE.test(providerId)) {
		return NextResponse.json({ error: 'providerId (uuid) is required.' }, { status: 400 });
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
	const hv = validateHeadersForKind('provider_services', parsed.headers);
	if (!hv.ok) {
		return NextResponse.json({ error: hv.error }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const { data: prov, error: pErr } = await sb.from('providers').select('id').eq('id', providerId).maybeSingle();
	if (pErr) {
		return NextResponse.json({ error: pErr.message }, { status: 500 });
	}
	if (!prov) {
		return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
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
		const category = String(row.category ?? '').trim() || 'service';
		const unit = String(row.unit ?? '').trim() || 'per_visit';
		if (!CATEGORIES.has(category)) {
			failures.push({ rowNumber, message: `Invalid category (use ${[...CATEGORIES].join(', ')})` });
			continue;
		}
		if (!UNITS.has(unit)) {
			failures.push({ rowNumber, message: `Invalid unit (use ${[...UNITS].join(', ')})` });
			continue;
		}
		const priceRaw = String(row.price ?? '').trim();
		const price = Number.parseFloat(priceRaw);
		if (!Number.isFinite(price) || price < 0) {
			failures.push({ rowNumber, message: 'Invalid price' });
			continue;
		}
		const currency = String(row.currency ?? '').trim().toUpperCase().slice(0, 8) || 'USD';
		const notes = String(row.notes ?? '').trim().slice(0, 2000) || null;
		const is_active = parseBool(String(row.is_active ?? 'true'));
		const sortRaw = String(row.sort_order ?? '').trim();
		const sort_order = sortRaw === '' ? 0 : Number.parseInt(sortRaw, 10);
		if (!Number.isFinite(sort_order)) {
			failures.push({ rowNumber, message: 'sort_order must be a number' });
			continue;
		}

		const { error: insErr } = await sb.from('provider_services').insert({
			provider_id: providerId,
			name: name.slice(0, 500),
			category,
			unit,
			price,
			currency,
			notes,
			is_active,
			sort_order,
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
		action: 'BULK_IMPORT_PROVIDER_SERVICES',
		resourceType: 'provider_services',
		resourceId: providerId,
		changes: { successCount, failureCount: failures.length },
		ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	});

	return NextResponse.json(result);
}
