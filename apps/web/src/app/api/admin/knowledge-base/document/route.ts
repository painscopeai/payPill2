import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageAiAdmin } from '@/server/auth/requireManageAiAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DEFAULT_WEBHOOK = 'https://silentminds.app.n8n.cloud/webhook/document';
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function webhookUrl(): string {
	return process.env.N8N_DOCUMENT_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK;
}

/**
 * POST multipart/form-data → forwards to n8n document webhook (avoids browser CORS).
 * Expects at least one file field: `file` (or any File parts — first file is required).
 */
export async function POST(request: NextRequest) {
	const ctx = await requireManageAiAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	let incoming: FormData;
	try {
		incoming = await request.formData();
	} catch {
		return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
	}

	const files = incoming.getAll('file').filter((v): v is File => v instanceof File);
	if (!files.length) {
		return NextResponse.json({ error: 'Missing file: use field name "file"' }, { status: 400 });
	}

	for (const f of files) {
		if (f.size > MAX_FILE_BYTES) {
			return NextResponse.json(
				{ error: `File too large: ${f.name} (max ${MAX_FILE_BYTES / (1024 * 1024)}MB)` },
				{ status: 413 },
			);
		}
	}

	const forward = new FormData();
	for (const f of files) {
		forward.append('file', f, f.name);
	}
	forward.append('source', 'paypill-admin');
	forward.append('adminId', ctx.adminId);
	forward.append('uploadedAt', new Date().toISOString());

	const secret = process.env.N8N_DOCUMENT_WEBHOOK_SECRET?.trim();
	const headers: Record<string, string> = {};
	if (secret) {
		headers['X-PayPill-Webhook-Secret'] = secret;
	}

	let upstream: Response;
	try {
		upstream = await fetch(webhookUrl(), {
			method: 'POST',
			body: forward,
			headers,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Webhook request failed';
		return NextResponse.json({ error: msg }, { status: 502 });
	}

	const text = await upstream.text();
	const ct = upstream.headers.get('content-type') ?? '';

	let body: unknown = text;
	if (ct.includes('application/json')) {
		try {
			body = JSON.parse(text);
		} catch {
			body = text;
		}
	}

	const outStatus = upstream.ok
		? 200
		: upstream.status >= 400 && upstream.status < 600
			? upstream.status
			: 502;

	return NextResponse.json(
		{
			ok: upstream.ok,
			status: upstream.status,
			webhookResponse: body,
		},
		{ status: outStatus },
	);
}
