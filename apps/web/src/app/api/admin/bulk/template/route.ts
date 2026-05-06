import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { requireManageUsersAdmin } from '@/server/auth/requireManageUsersAdmin';
import {
	buildTemplateCsv,
	isBulkTemplateKind,
	BULK_TEMPLATE_FILENAMES,
	type BulkTemplateKind,
} from '@/server/bulk/bulkImportKinds';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USER_KINDS = new Set<BulkTemplateKind>(['employees', 'employer_contracts']);

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const kindRaw = url.searchParams.get('kind')?.trim() || '';
	if (!isBulkTemplateKind(kindRaw)) {
		return NextResponse.json({ error: 'Invalid or missing kind parameter.' }, { status: 400 });
	}

	let ctx;
	if (USER_KINDS.has(kindRaw)) {
		ctx = await requireManageUsersAdmin(request);
	} else {
		ctx = await requireManageProvidersAdmin(request);
	}
	if (ctx instanceof NextResponse) return ctx;

	const csv = buildTemplateCsv(kindRaw);
	const filename = BULK_TEMPLATE_FILENAMES[kindRaw];
	return new NextResponse(csv, {
		status: 200,
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
}
