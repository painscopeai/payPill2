import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireProvider } from '@/server/auth/requireProvider';
import { mergeSettingsIntoForm } from '@/server/forms/formSerialization';
import { isProviderPortalFormType } from '@/server/forms/assertProviderFormAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const pageLimit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
	const status = url.searchParams.get('status') || undefined;

	const sb = getSupabaseAdmin();
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;

	try {
		let q = sb
			.from('forms')
			.select('*', { count: 'exact' })
			.eq('owner_scope', 'provider')
			.eq('owner_profile_id', ctx.userId)
			.in('form_type', ['consent', 'service_intake'])
			.order('updated_at', { ascending: false })
			.range(from, to);
		if (status) q = q.eq('status', status);
		const { data: formRows, error: listErr, count } = await q;
		if (listErr) throw listErr;
		const total = count ?? 0;
		const items = (formRows || []).map((row: Record<string, unknown>) => mergeSettingsIntoForm(row));

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

type CreateBody = {
	name?: string;
	form_type?: string;
	description?: string;
	category?: string | null;
	settings?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: CreateBody;
	try {
		body = (await request.json()) as CreateBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const form_type = typeof body.form_type === 'string' ? body.form_type.trim() : '';
	if (!name) {
		return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
	}
	if (!form_type || !isProviderPortalFormType(form_type)) {
		return NextResponse.json(
			{ error: 'form_type must be "consent" or "service_intake" for provider forms' },
			{ status: 400 },
		);
	}

	const sb = getSupabaseAdmin();
	const formData: Record<string, unknown> = {
		name,
		form_type,
		description: typeof body.description === 'string' ? body.description : '',
		category: body.category === undefined || body.category === null ? null : String(body.category),
		created_by: ctx.userId,
		status: 'draft',
		owner_scope: 'provider',
		owner_profile_id: ctx.userId,
	};
	if (
		body.settings !== undefined &&
		typeof body.settings === 'object' &&
		body.settings !== null &&
		!Array.isArray(body.settings)
	) {
		formData.settings = body.settings;
	}

	try {
		const { data: form, error: formErr } = await sb.from('forms').insert(formData).select().single();
		if (formErr) throw formErr;
		if (!form) throw new Error('Insert returned no row');

		return NextResponse.json({
			id: form.id as string,
			name: form.name,
			form_type: form.form_type,
			description: form.description,
			status: form.status,
			created_by: form.created_by,
			created_at: form.created_at,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to create form';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
