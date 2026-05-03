/**
 * Model ID for Generative Language API (REST). Defaults must work for new API keys:
 * e.g. gemini-2.0-flash may return 404 ("no longer available to new users").
 * Override via GEMINI_MODEL if Google changes availability again.
 */
export const GEMINI_GENERATE_MODEL_ID = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

export function buildGeminiGenerateContentUrl(apiKey) {
	const id = encodeURIComponent(GEMINI_GENERATE_MODEL_ID);
	return `https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent?key=${apiKey}`;
}
