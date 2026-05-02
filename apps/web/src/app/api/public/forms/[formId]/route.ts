import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { mergeSettingsIntoForm, normalizeQuestionForClient } from '@/server/forms/formSerialization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Read-only form definition for anonymous respondents (published forms only).
 */
export async function GET(
	request: NextRequest,
	context: { params: Promise<{ formId: string }> },
) {
	const { formId } = await context.params;
	const sb = getSupabaseAdmin();

	try {
		const { data: form, error: formErr } = await sb.from('forms').select('*').eq('id', formId).maybeSingle();
		if (formErr) throw formErr;
		if (!form) {
			return NextResponse.json({ error: 'Form not found' }, { status: 404 });
		}
		if ((form as { status?: string }).status !== 'published') {
			return NextResponse.json({ error: 'Form is not published' }, { status: 403 });
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
		const msg = e instanceof Error ? e.message : 'Failed to load form';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
