/**
 * Model ID for Generative Language API (REST). Unversioned IDs like gemini-1.5-flash
 * may return HTTP 404 after Google retires them — override via GEMINI_MODEL if needed.
 */
export const GEMINI_GENERATE_MODEL_ID = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';

export function buildGeminiGenerateContentUrl(apiKey) {
	const id = encodeURIComponent(GEMINI_GENERATE_MODEL_ID);
	return `https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent?key=${apiKey}`;
}
