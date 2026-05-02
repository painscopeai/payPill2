import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { mergeSettingsIntoForm, normalizeQuestionForClient, settingsFromFormPayload } from '@/server/forms/formSerialization';
import { VALID_FORM_TYPES } from '@/lib/validFormTypes';

function sb(): SupabaseClient {
	return getSupabaseAdmin();
}

export type BuilderSyncQuestionInput = {
	id?: string;
	question_text?: string;
	question_type?: string;
	options_json?: unknown[];
	options?: unknown[];
	required?: boolean;
	sort_order?: number;
	config?: Record<string, unknown>;
	validation_json?: Record<string, unknown>;
};

export type BuilderSyncFormInput = {
	name?: string;
	description?: string | null;
	form_type?: string;
	status?: string;
	category?: string | null;
	settings?: Record<string, unknown>;
	/** Flattened keys merged into settings */
	theme_header_color?: string;
	collect_email?: boolean;
	allow_multiple_responses?: boolean;
	confirmation_message?: string;
	show_progress_bar?: boolean;
	shuffle_questions?: boolean;
	show_question_numbers?: boolean;
};

export async function syncFormBuilderPayload(params: {
	formId: string;
	form: BuilderSyncFormInput;
	questions: BuilderSyncQuestionInput[];
}): Promise<{ form: Record<string, unknown>; questions: Record<string, unknown>[] }> {
	const { formId, form: patch, questions: incoming } = params;

	const existing = await sb().from('forms').select('*').eq('id', formId).maybeSingle();
	if (!existing.data) {
		throw Object.assign(new Error('Form not found'), { status: 404 });
	}

	const row = existing.data as Record<string, unknown>;
	const prevSettings =
		row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
			? { ...(row.settings as Record<string, unknown>) }
			: {};

	const flatSettings = settingsFromFormPayload(patch as Record<string, unknown>);
	const mergedSettings = {
		...prevSettings,
		...flatSettings,
		...(patch.settings && typeof patch.settings === 'object' ? patch.settings : {}),
	};

	const updates: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
		settings: mergedSettings,
	};

	if (typeof patch.name === 'string' && patch.name.trim()) updates.name = patch.name.trim();
	if (patch.description !== undefined) updates.description = patch.description;
	if (typeof patch.category === 'string' || patch.category === null) updates.category = patch.category;

	if (typeof patch.form_type === 'string') {
		if (!(VALID_FORM_TYPES as readonly string[]).includes(patch.form_type)) {
			throw Object.assign(new Error(`Invalid form_type`), { status: 400 });
		}
		updates.form_type = patch.form_type;
	}
	if (typeof patch.status === 'string') updates.status = patch.status;

	const { error: upErr } = await sb().from('forms').update(updates).eq('id', formId);
	if (upErr) throw upErr;

	const { error: delErr } = await sb().from('form_questions').delete().eq('form_id', formId);
	if (delErr) throw delErr;

	const rows = (incoming || []).map((q, i) => {
		const opts = Array.isArray(q.options_json)
			? q.options_json
			: Array.isArray(q.options)
				? q.options
				: [];
		const text = typeof q.question_text === 'string' ? q.question_text.trim() : '';
		const qtype = typeof q.question_type === 'string' ? q.question_type : 'short_text';
		const sort = typeof q.sort_order === 'number' ? q.sort_order : i;
		const cfg =
			q.config && typeof q.config === 'object' && !Array.isArray(q.config)
				? q.config
				: q.validation_json && typeof q.validation_json === 'object' && !Array.isArray(q.validation_json)
					? (q.validation_json as Record<string, unknown>)
					: {};
		return {
			form_id: formId,
			question_text: text || `Question ${i + 1}`,
			question_type: qtype,
			options: opts,
			required: q.required !== false,
			sort_order: sort,
			config: cfg,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
	});

	let inserted: Record<string, unknown>[] = [];
	if (rows.length > 0) {
		const ins = await sb().from('form_questions').insert(rows).select('*');
		if (ins.error) throw ins.error;
		inserted = (ins.data || []) as Record<string, unknown>[];
	}

	const { data: freshForm, error: gErr } = await sb().from('forms').select('*').eq('id', formId).single();
	if (gErr) throw gErr;

	const mergedForm = mergeSettingsIntoForm(freshForm as Record<string, unknown>);
	const normalizedQs = inserted.map((q) => normalizeQuestionForClient(q));

	return { form: mergedForm as Record<string, unknown>, questions: normalizedQs };
}
