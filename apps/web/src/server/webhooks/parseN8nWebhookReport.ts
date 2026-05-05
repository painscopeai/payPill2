/**
 * Turns n8n "Respond to Webhook" body (JSON or plain text) into a single markdown / text report.
 */

function normalizeEscapes(s: string): string {
	return s
		.replace(/\\n/g, '\n')
		.replace(/\\r\\n/g, '\n')
		.replace(/\\t/g, '\t')
		.replace(/\\"/g, '"')
		.trim();
}

function pickString(v: unknown): v is string {
	return typeof v === 'string' && v.length > 0;
}

/**
 * @param rawText - Response body text from fetch(webhook)
 */
export function extractReportFromN8nResponse(rawText: string): string {
	const trimmed = rawText.trim();
	if (!trimmed) return '';

	try {
		const j: unknown = JSON.parse(trimmed);
		if (pickString(j)) {
			return normalizeEscapes(j);
		}
		if (j && typeof j === 'object' && !Array.isArray(j)) {
			const o = j as Record<string, unknown>;
			const candidates: unknown[] = [
				o.output,
				o.text,
				o.report,
				o.message,
				(o.body as Record<string, unknown> | undefined)?.output,
				(o.data as Record<string, unknown> | undefined)?.output,
				(o.json as Record<string, unknown> | undefined)?.output,
			];
			for (const c of candidates) {
				if (pickString(c)) return normalizeEscapes(c);
			}
		}
		if (Array.isArray(j) && j.length > 0) {
			const first = j[0] as Record<string, unknown> | undefined;
			if (first && pickString(first.output)) return normalizeEscapes(first.output);
			if (first && pickString(first.json) && typeof first.json === 'object') {
				const jn = first.json as Record<string, unknown>;
				if (pickString(jn.output)) return normalizeEscapes(jn.output);
			}
		}
		// Structured but no single string: present readable JSON
		return normalizeEscapes(JSON.stringify(j, null, 2));
	} catch {
		return normalizeEscapes(trimmed);
	}
}
