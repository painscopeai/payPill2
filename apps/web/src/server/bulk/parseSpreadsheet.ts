import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import type { BulkTemplateKind } from '@/server/bulk/bulkImportKinds';
import { BULK_HEADERS, BULK_OPTIONAL_HEADERS } from '@/server/bulk/bulkImportKinds';

export type ParsedSheet = {
	headers: string[];
	rows: Record<string, string>[];
};

function normHeader(h: string): string {
	return String(h ?? '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_]/g, '');
}

function rowsFromMatrix(matrix: string[][]): ParsedSheet {
	if (!matrix.length) {
		return { headers: [], rows: [] };
	}
	const rawHeaders = matrix[0].map((c) => normHeader(String(c)));
	const headers = rawHeaders.filter(Boolean);
	const rows: Record<string, string>[] = [];
	for (let r = 1; r < matrix.length; r++) {
		const line = matrix[r];
		if (!line || line.every((c) => String(c ?? '').trim() === '')) continue;
		const obj: Record<string, string> = {};
		for (let c = 0; c < rawHeaders.length; c++) {
			const key = rawHeaders[c];
			if (!key) continue;
			obj[key] = String(line[c] ?? '').trim();
		}
		rows.push(obj);
	}
	return { headers, rows };
}

export function parseSpreadsheetBuffer(buf: Buffer, filename: string): ParsedSheet {
	const lower = filename.toLowerCase();
	if (lower.endsWith('.csv')) {
		const text = buf.toString('utf8');
		const records = parse(text, {
			columns: false,
			skip_empty_lines: false,
			trim: true,
			relax_column_count: true,
		}) as string[][];
		return rowsFromMatrix(records);
	}

	const wb = XLSX.read(buf, { type: 'buffer' });
	const sheetName = wb.SheetNames[0];
	if (!sheetName) {
		return { headers: [], rows: [] };
	}
	const sheet = wb.Sheets[sheetName];
	const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
		header: 1,
		raw: false,
		defval: '',
	}) as string[][];
	return rowsFromMatrix(matrix);
}

export function validateHeadersForKind(
	kind: BulkTemplateKind,
	parsedHeaders: string[],
): { ok: true } | { ok: false; error: string } {
	const required = BULK_HEADERS[kind];
	const optional = BULK_OPTIONAL_HEADERS[kind] ?? [];
	const got = new Set(parsedHeaders.map(normHeader).filter(Boolean));
	const reqNorm = new Set(required.map((h) => normHeader(h)));
	const allowedNorm = new Set([
		...required.map((h) => normHeader(h)),
		...optional.map((h) => normHeader(h)),
	]);
	for (const e of reqNorm) {
		if (!got.has(e)) {
			const optHint = optional.length ? ` Optional: ${optional.join(', ')}.` : '';
			return {
				ok: false,
				error: `Missing column "${e}". Required: ${required.join(', ')}.${optHint}`,
			};
		}
	}
	for (const g of got) {
		if (!allowedNorm.has(g)) {
			return {
				ok: false,
				error: `Unexpected column "${g}". Required: ${required.join(', ')}.${optional.length ? ` Allowed optional: ${optional.join(', ')}.` : ''}`,
			};
		}
	}
	return { ok: true };
}

export type RowFailure = { rowNumber: number; message: string };

/** Returned only by employee bulk import: same values as the sheet, for one-time admin copy (not stored). */
export type SheetCredentialRow = {
	rowNumber: number;
	email: string;
	spreadsheetPassword: string;
};

export type BulkImportResult = {
	successCount: number;
	failures: RowFailure[];
	/** Present for employee imports only; mirrors the uploaded file for sharing initial sign-in passwords. */
	sheetCredentials?: SheetCredentialRow[];
};
