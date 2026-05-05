import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { requireManageAiAdmin } from '@/server/auth/requireManageAiAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { purgeUploadedFileAdmin } from '@/server/knowledge/purgeUploadedFile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DEFAULT_WEBHOOK = 'https://northsnow.app.n8n.cloud/webhook/document';
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function webhookUrl(): string {
	return process.env.N8N_DOCUMENT_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK;
}

export type UploadedFilePayload = {
	id: string;
	storagePath: string;
	fileName: string;
	size: number;
	mimeType: string;
	checksum: string;
};

/**
 * POST multipart/form-data → forwards to n8n document webhook (avoids browser CORS).
 * Computes SHA-256 per file; replaces existing admin_kb row with same checksum (dedupe).
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

	const sb = getSupabaseAdmin();
	const uploadedFiles: UploadedFilePayload[] = [];
	const forwardBuffers: Buffer[] = [];
	let replaced = false;

	for (const f of files) {
		const bytes = Buffer.from(await f.arrayBuffer());
		forwardBuffers.push(bytes);
		const checksum = createHash('sha256').update(bytes).digest('hex');

		const { data: dup } = await sb
			.from('uploaded_files')
			.select('id')
			.eq('user_id', ctx.adminId)
			.eq('source', 'admin_kb')
			.eq('checksum_sha256', checksum)
			.maybeSingle();

		if (dup?.id) {
			try {
				await purgeUploadedFileAdmin(sb, dup.id);
				replaced = true;
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Failed to replace existing upload';
				return NextResponse.json({ error: msg }, { status: 500 });
			}
		}

		const objectPath = `${ctx.adminId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${f.name}`;
		const { error: storageErr } = await sb.storage.from('uploads').upload(objectPath, bytes, {
			contentType: f.type || 'application/octet-stream',
			upsert: false,
		});
		if (storageErr) {
			return NextResponse.json({ error: `Failed to store file: ${storageErr.message}` }, { status: 500 });
		}

		const ext = f.name.includes('.') ? f.name.split('.').pop()?.toLowerCase() : null;
		const { data: fileRow, error: fileErr } = await sb
			.from('uploaded_files')
			.insert({
				user_id: ctx.adminId,
				bucket: 'uploads',
				path: objectPath,
				file_name: f.name,
				file_extension: ext ?? null,
				mime_type: f.type || null,
				size_bytes: bytes.length,
				checksum_sha256: checksum,
				source: 'admin_kb',
				parent_type: 'knowledge_base',
				metadata: { uploaded_via: 'admin_web', checksum_sha256: checksum },
			})
			.select('id')
			.single();
		if (fileErr || !fileRow) {
			return NextResponse.json({ error: `Failed to log upload metadata: ${fileErr?.message || 'unknown error'}` }, { status: 500 });
		}

		uploadedFiles.push({
			id: fileRow.id,
			storagePath: objectPath,
			fileName: f.name,
			size: bytes.length,
			mimeType: f.type || '',
			checksum,
		});
	}

	const forward = new FormData();
	for (let i = 0; i < files.length; i++) {
		const f = files[i];
		const bytes = forwardBuffers[i];
		if (!bytes) continue;
		const blobPart = new Uint8Array(bytes);
		forward.append(
			'file',
			new Blob([blobPart], { type: f.type || 'application/octet-stream' }),
			f.name,
		);
	}
	forward.append('source', 'paypill-admin');
	forward.append('adminId', ctx.adminId);
	forward.append('uploadedAt', new Date().toISOString());
	forward.append('uploadedFiles', JSON.stringify(uploadedFiles));
	forward.append('uploadedFileIds', JSON.stringify(uploadedFiles.map((f) => f.id)));

	const first = uploadedFiles[0];
	if (first) {
		forward.append('uploadedFileId', first.id);
		forward.append('fileName', first.fileName);
		forward.append('mimeType', first.mimeType);
		forward.append('checksum', first.checksum);
		forward.append(
			'knowledgeBaseId',
			incoming.get('knowledgeBaseId')?.toString().trim() || '',
		);
	}

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
			replaced,
			webhookResponse: body,
			uploadedFiles,
		},
		{ status: outStatus },
	);
}
