/**
 * Admin knowledge-base uploads: PDF only (name, declared MIME, and optional byte sniff).
 */

const PDF_MIMES = new Set(['application/pdf', 'application/x-pdf']);

export function isAdminKbPdfFile(file: { name: string; type?: string }): boolean {
	const name = (file.name || '').trim();
	const lower = name.toLowerCase();
	if (!lower.endsWith('.pdf')) return false;

	const mime = (file.type || '').trim().toLowerCase();
	if (!mime) return true;
	if (mime === 'application/octet-stream') return true;
	return PDF_MIMES.has(mime);
}

/** First line of a well-formed PDF file is `%PDF-1.x` (spec: file begins with header). */
export function pdfBytesLookValid(bytes: ArrayBuffer | Uint8Array | Buffer): boolean {
	const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes as ArrayBuffer);
	if (u8.length < 5) return false;
	return u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46 && u8[4] === 0x2d;
}
