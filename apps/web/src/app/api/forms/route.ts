import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireManageFormsAdmin } from '@/server/auth/requireManageFormsAdmin';
import { mergeSettingsIntoForm } from '@/server/forms/formSerialization';
import { VALID_FORM_TYPES } from '@/lib/validFormTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
	const ctx = await requireManageFormsAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const pageLimit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
	const status = url.searchParams.get('status') || undefined;
	const form_type = url.searchParams.get('form_type') || undefined;

	if (form_type && !(VALID_FORM_TYPES as readonly string[]).includes(form_type)) {
		return NextResponse.json(
			{ error: `Invalid form_type: must be one of [${VALID_FORM_TYPES.join(', ')}]` },
			{ status: 400 },
		);
	}

	const sb = getSupabaseAdmin();
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;

	try {
		let q = sb.from('forms').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
		if (status) q = q.eq('status', status as string);
		if (form_type) q = q.eq('form_type', form_type);
		const { data: formRows, error: listErr, count } = await q;
		if (listErr) throw listErr;
		const total = count ?? 0;
		const items = (formRows || []).map((row: Record<string, unknown>) =>
			mergeSettingsIntoForm(row),
		);

		return NextResponse.json({
			items,
			page: pageNum,
			perPage: pageLimit,
			totalItems: total,
			totalPages: Math.max(1, Math.ceil(total / pageLimit)),
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to fetch forms';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
