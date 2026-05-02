import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireManageFormsAdmin } from '@/server/auth/requireManageFormsAdmin';
import { mergeSettingsIntoForm, normalizeQuestionForClient } from '@/server/forms/formSerialization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ formId: string }> },
) {
	const ctx = await requireManageFormsAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { formId } = await context.params;

	const sb = getSupabaseAdmin();
	try {
		const { data: form, error: formErr } = await sb.from('forms').select('*').eq('id', formId).maybeSingle();
		if (formErr) throw formErr;
		if (!form) {
			return NextResponse.json({ error: 'Form not found' }, { status: 404 });
		}
		const { data: questions, error: qErr } = await sb
			.from('form_questions')
			.select('*')
			.eq('form_id', formId)
			.order('sort_order', { ascending: true });
		if (qErr) throw qErr;

		const merged = mergeSettingsIntoForm(form as Record<string, unknown>);
		const normalizedQs = (questions || []).map((q: Record<string, unknown>) =>
			normalizeQuestionForClient(q),
		);

		return NextResponse.json({
			...merged,
			questions: normalizedQs,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to fetch form';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

/**
 * DELETE /api/forms/:formId — remove form; children cascade in DB or we delete explicitly.
 */
export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ formId: string }> },
) {
	const ctx = await requireManageFormsAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { formId } = await context.params;

	const sb = getSupabaseAdmin();
	try {
		const { data: existing, error: exErr } = await sb.from('forms').select('id').eq('id', formId).maybeSingle();
		if (exErr) throw exErr;
		if (!existing) {
			return NextResponse.json({ error: 'Form not found' }, { status: 404 });
		}

		const { error: qDelErr } = await sb.from('form_questions').delete().eq('form_id', formId);
		if (qDelErr) throw qDelErr;
		const { error: rDelErr } = await sb.from('form_responses').delete().eq('form_id', formId);
		if (rDelErr) throw rDelErr;
		const { error: fDelErr } = await sb.from('forms').delete().eq('id', formId);
		if (fDelErr) throw fDelErr;

		return NextResponse.json({
			success: true,
			message: 'Form deleted successfully',
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to delete form';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
