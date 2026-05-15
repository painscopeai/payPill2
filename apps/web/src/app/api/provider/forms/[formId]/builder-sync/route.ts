import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getProviderOwnedForm, isProviderPortalFormType } from '@/server/forms/assertProviderFormAccess';
import { syncFormBuilderPayload } from '@/server/forms/builderSync';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function errResponse(e: unknown, fallback = 500) {
	const msg = e instanceof Error ? e.message : 'Server error';
	const status =
		typeof e === 'object' && e !== null && 'status' in e && typeof (e as { status: unknown }).status === 'number'
			? (e as { status: number }).status
			: fallback;
	return NextResponse.json({ error: msg }, { status });
}

export async function PUT(
	request: NextRequest,
	context: { params: Promise<{ formId: string }> },
) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	const { formId } = await context.params;
	const sb = getSupabaseAdmin();

	const owned = await getProviderOwnedForm(sb, ctx.userId, formId);
	if (!owned) {
		return NextResponse.json({ error: 'Form not found' }, { status: 404 });
	}

	let body: { form?: Record<string, unknown>; questions?: unknown[] };
	try {
		body = (await request.json()) as { form?: Record<string, unknown>; questions?: unknown[] };
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const form = body.form || {};
	const questions = Array.isArray(body.questions) ? body.questions : [];

	const nextType =
		typeof form.form_type === 'string' && form.form_type.trim()
			? form.form_type.trim()
			: (owned.form_type as string);
	if (!isProviderPortalFormType(nextType)) {
		return NextResponse.json(
			{ error: 'Provider forms must remain type "consent" or "service_intake".' },
			{ status: 400 },
		);
	}

	try {
		const result = await syncFormBuilderPayload({
			formId,
			form,
			questions: questions as Parameters<typeof syncFormBuilderPayload>[0]['questions'],
		});
		return NextResponse.json({
			form: result.form,
			questions: result.questions,
		});
	} catch (e) {
		return errResponse(e);
	}
}
