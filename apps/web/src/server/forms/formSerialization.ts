/**
 * Map DB row shapes to what the React Form Builder and FormSubmissionPage expect.
 */

export type FormSettings = {
	theme_header_color?: string;
	collect_email?: boolean;
	allow_multiple_responses?: boolean;
	confirmation_message?: string;
	show_progress_bar?: boolean;
	shuffle_questions?: boolean;
	show_question_numbers?: boolean;
};

export function mergeSettingsIntoForm<T extends Record<string, unknown>>(form: T): T & FormSettings {
	const raw = form.settings;
	const s =
		raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
	return {
		...form,
		theme_header_color:
			(typeof s.theme_header_color === 'string' && s.theme_header_color) || 'hsl(var(--primary))',
		collect_email: s.collect_email !== false,
		allow_multiple_responses: s.allow_multiple_responses === true,
		confirmation_message:
			typeof s.confirmation_message === 'string'
				? s.confirmation_message
				: 'Your response has been recorded.',
		show_progress_bar: s.show_progress_bar === true,
		shuffle_questions: s.shuffle_questions === true,
		show_question_numbers: s.show_question_numbers !== false,
	};
}

/** Only keys explicitly provided are merged (safe for empty PATCH bodies). */
export function settingsFromFormPayload(payload: Record<string, unknown>): Partial<FormSettings> {
	const out: Partial<FormSettings> = {};
	if ('theme_header_color' in payload && typeof payload.theme_header_color === 'string') {
		out.theme_header_color = payload.theme_header_color;
	}
	if ('collect_email' in payload) {
		out.collect_email = payload.collect_email !== false;
	}
	if ('allow_multiple_responses' in payload) {
		out.allow_multiple_responses = payload.allow_multiple_responses === true;
	}
	if ('confirmation_message' in payload && typeof payload.confirmation_message === 'string') {
		out.confirmation_message = payload.confirmation_message;
	}
	if ('show_progress_bar' in payload) {
		out.show_progress_bar = payload.show_progress_bar === true;
	}
	if ('shuffle_questions' in payload) {
		out.shuffle_questions = payload.shuffle_questions === true;
	}
	if ('show_question_numbers' in payload) {
		out.show_question_numbers = payload.show_question_numbers !== false;
	}
	return out;
}

export function normalizeQuestionForClient(q: Record<string, unknown>): Record<string, unknown> {
	const opts = q.options ?? q.options_json;
	const arr = Array.isArray(opts) ? opts : [];
	const cfg =
		q.config && typeof q.config === 'object' && !Array.isArray(q.config)
			? (q.config as Record<string, unknown>)
			: {};
	const validation_json =
		q.validation_json && typeof q.validation_json === 'object' && !Array.isArray(q.validation_json)
			? (q.validation_json as Record<string, unknown>)
			: Object.keys(cfg).length
				? cfg
				: {};
	return {
		...q,
		options_json: arr,
		validation_json,
		sort_order: typeof q.sort_order === 'number' ? q.sort_order : 0,
	};
}
