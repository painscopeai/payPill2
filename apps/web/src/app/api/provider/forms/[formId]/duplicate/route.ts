import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireProvider } from '@/server/auth/requireProvider';
import { getProviderOwnedForm } from '@/server/forms/assertProviderFormAccess';
import { normalizeQuestionForClient } from '@/server/forms/formSerialization';
import { syncFormBuilderPayload } from '@/server/forms/builderSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ formId: string }> },
) {
	void request;
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	const { formId } = await context.params;
	const sb = getSupabaseAdmin();

	try {
		const owned = await getProviderOwnedForm(sb, ctx.userId, formId);
		if (!owned) {
			return NextResponse.json({ error: 'Form not found' }, { status: 404 });
		}

		const { data: formRow, error: fErr } = await sb.from('forms').select('*').eq('id', formId).single();
		if (fErr) throw fErr;
		const { data: questions, error: qErr } = await sb
			.from('form_questions')
			.select('*')
			.eq('form_id', formId)
			.order('sort_order', { ascending: true });
		if (qErr) throw qErr;

		const rawForm = formRow as Record<string, unknown>;
		const baseName = typeof rawForm.name === 'string' ? rawForm.name : 'Untitled';
		const now = new Date().toISOString();
		const settings =
			rawForm.settings && typeof rawForm.settings === 'object' && !Array.isArray(rawForm.settings)
				? rawForm.settings
				: {};

		const { data: created, error: insErr } = await sb
			.from('forms')
			.insert({
				name: `Copy of ${baseName}`,
				description: (rawForm.description as string) || '',
				form_type: rawForm.form_type,
				category: (rawForm.category as string) || null,
				status: 'draft',
				created_by: ctx.userId,
				owner_scope: 'provider',
				owner_profile_id: ctx.userId,
				settings,
				created_at: now,
				updated_at: now,
			})
			.select('*')
			.single();
		if (insErr) throw insErr;

		const newId = created.id as string;
		const normalizedQs = (questions || []).map((q: Record<string, unknown>) => normalizeQuestionForClient(q));
		const synced = await syncFormBuilderPayload({
			formId: newId,
			form: { name: `Copy of ${baseName}`, status: 'draft' },
			questions: normalizedQs.map((q: Record<string, unknown>, i: number) => ({
				question_text: q.question_text,
				question_type: q.question_type,
				options_json: q.options_json,
				required: q.required !== false,
				sort_order: typeof q.sort_order === 'number' ? q.sort_order : i,
				config:
					q.config && typeof q.config === 'object' && !Array.isArray(q.config)
						? (q.config as Record<string, unknown>)
						: undefined,
				validation_json:
					q.validation_json && typeof q.validation_json === 'object' && !Array.isArray(q.validation_json)
						? (q.validation_json as Record<string, unknown>)
						: undefined,
			})),
		});

		return NextResponse.json({ form: synced.form, questions: synced.questions }, { status: 201 });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Duplicate failed';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
