/**
 * Minimal RFC-style CSV (quoted fields supported).
 * @returns {{ headers: string[], rows: Record<string, string>[] }}
 */
export function parseSimpleCsv(text) {
	const norm = String(text || '').replace(/^\uFEFF/, '').trim();
	if (!norm) return { headers: [], rows: [] };

	const rawLines = norm.split(/\r?\n/).filter((l) => l.trim() !== '');
	if (!rawLines.length) return { headers: [], rows: [] };

	function parseCells(line) {
		const out = [];
		let cur = '';
		let inQ = false;
		for (let i = 0; i < line.length; i++) {
			const c = line[i];
			if (inQ) {
				if (c === '"' && line[i + 1] === '"') {
					cur += '"';
					i++;
					continue;
				}
				if (c === '"') {
					inQ = false;
					continue;
				}
				cur += c;
				continue;
			}
			if (c === '"') {
				inQ = true;
				continue;
			}
			if (c === ',') {
				out.push(cur.trim());
				cur = '';
				continue;
			}
			cur += c;
		}
		out.push(cur.trim());
		return out;
	}

	const headers = parseCells(rawLines[0]).map((h) =>
		h
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '_')
			.replace(/[^a-z0-9_]/g, ''),
	);

	const rows = [];
	for (let li = 1; li < rawLines.length; li++) {
		const cells = parseCells(rawLines[li]);
		if (cells.every((c) => c === '')) continue;
		const obj = {};
		for (let i = 0; i < headers.length; i++) {
			const key = headers[i];
			if (!key) continue;
			obj[key] = cells[i] ?? '';
		}
		rows.push(obj);
	}
	return { headers, rows };
}
