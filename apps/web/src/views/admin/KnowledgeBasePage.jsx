import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, CheckCircle2, XCircle, Loader2, X, Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import apiServerClient from '@/lib/apiServerClient';
import { isAdminKbPdfFile } from '@/lib/isAdminKbPdfUpload';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_RECENT = 25;
/** `apiServerClient` prepends `/api` — paths must be `/admin/...`, never `/api/admin/...` (avoids `/api/api/...`). */
const ACCEPT = '.pdf,application/pdf';

/** Read JSON from fetch Response exactly once (never call .json() then .text()). */
async function readResponsePayload(res) {
	const text = await res.text();
	if (!text || !text.trim()) {
		return { _empty: true };
	}
	try {
		return JSON.parse(text);
	} catch {
		return { error: 'Non-JSON response', raw: text.slice(0, 500) };
	}
}

/**
 * Admin AI Knowledge Base — upload files to the n8n document webhook (server-proxied).
 */
export default function KnowledgeBasePage() {
	const [recent, setRecent] = useState([]);
	const [pendingFiles, setPendingFiles] = useState([]);
	const [isUploading, setIsUploading] = useState(false);
	const inputRef = useRef(null);

	const loadRecentFromServer = useCallback(async () => {
		try {
			const res = await apiServerClient.fetch('/admin/uploaded-files?limit=25');
			const payload = await readResponsePayload(res);
			if (!res.ok) throw new Error(payload?.error || `Request failed (${res.status})`);
			const items = Array.isArray(payload?.items) ? payload.items : [];
			setRecent(
				items.map((row) => ({
					id: row.id,
					uploadedFileId: row.id,
					fileName: row.file_name || 'Untitled',
					size: typeof row.size_bytes === 'number' ? row.size_bytes : null,
					sentAt: row.created_at || new Date().toISOString(),
					success: true,
					error: null,
				})),
			);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to load upload history');
		}
	}, []);

	const deleteUploadedFile = async (uploadedFileId) => {
		if (!uploadedFileId) return;
		try {
			const res = await apiServerClient.fetch(`/admin/knowledge-base/${uploadedFileId}`, {
				method: 'DELETE',
			});
			const payload = await readResponsePayload(res);
			if (!res.ok) throw new Error(payload?.error || `Delete failed (${res.status})`);
			toast.success('Document and vectors removed');
			await loadRecentFromServer();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Delete failed');
		}
	};

	useEffect(() => {
		loadRecentFromServer();
	}, [loadRecentFromServer]);

	const pushRecent = useCallback((entry) => {
		setRecent((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, MAX_RECENT));
	}, []);

	const addFilesToQueue = (fileList) => {
		const next = Array.from(fileList).filter((f) => f instanceof File);
		if (!next.length) return;

		setPendingFiles((prev) => {
			const seen = new Set(prev.map((p) => `${p.name}-${p.size}`));
			const merged = [...prev];
			for (const f of next) {
				if (f.size > MAX_FILE_BYTES) {
					toast.error(`${f.name} is over 50MB — skipped`);
					continue;
				}
				if (!isAdminKbPdfFile(f)) {
					toast.error(`${f.name} — only PDF files are allowed`);
					continue;
				}
				const key = `${f.name}-${f.size}`;
				if (seen.has(key)) continue;
				seen.add(key);
				merged.push(f);
			}
			return merged;
		});
		if (inputRef.current) inputRef.current.value = '';
	};

	const removePending = (index) => {
		setPendingFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const clearPending = () => {
		setPendingFiles([]);
		if (inputRef.current) inputRef.current.value = '';
	};

	const uploadOne = async (file) => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const formData = new FormData();
		formData.append('file', file, file.name);

		const res = await apiServerClient.fetch('/admin/knowledge-base/document', {
			method: 'POST',
			body: formData,
			timeoutMs: 300_000,
		});

		const payload = await readResponsePayload(res);

		if (!res.ok) {
			const msg =
				(typeof payload?.error === 'string' && payload.error) ||
				(typeof payload?.message === 'string' && payload.message) ||
				`Request failed (${res.status})`;
			throw new Error(msg);
		}

		if (!payload || typeof payload !== 'object' || payload.ok !== true) {
			const msg =
				(typeof payload?.error === 'string' && payload.error) ||
				'Pipeline did not confirm success — check n8n execution logs.';
			throw new Error(msg);
		}

		if (payload.replaced === true) {
			toast.message('Replaced existing version (same file checksum)');
		}

		const uf = Array.isArray(payload.uploadedFiles) ? payload.uploadedFiles[0] : null;
		pushRecent({
			id: uf?.id || id,
			uploadedFileId: uf?.id || id,
			fileName: file.name,
			size: typeof uf?.size === 'number' ? uf.size : file.size,
			sentAt: new Date().toISOString(),
			success: true,
		});
	};

	const sendPipeline = async () => {
		if (!pendingFiles.length || isUploading) return;

		setIsUploading(true);
		let ok = 0;
		const queue = [...pendingFiles];

		const failed = [];
		try {
			for (const file of queue) {
				try {
					await uploadOne(file);
					ok++;
				} catch (e) {
					failed.push(file);
					const errId = `${Date.now()}-err-${Math.random().toString(36).slice(2, 8)}`;
					pushRecent({
						id: errId,
						fileName: file.name,
						size: file.size,
						sentAt: new Date().toISOString(),
						success: false,
						error: e instanceof Error ? e.message : 'Failed',
					});
					toast.error(`${file.name}: ${e instanceof Error ? e.message : 'upload failed'}`);
				}
			}

			setPendingFiles(failed);

			if (ok > 0) {
				toast.success(
					ok === queue.length
						? `Sent ${ok} document${ok === 1 ? '' : 's'} to the indexing pipeline`
						: `Sent ${ok} of ${queue.length}. ${failed.length ? 'Fix issues and retry the rest.' : ''}`,
				);
				await loadRecentFromServer();
			}
		} finally {
			setIsUploading(false);
			if (inputRef.current) inputRef.current.value = '';
		}
	};

	const onInputChange = (e) => {
		addFilesToQueue(e.target.files);
	};

	const onDrop = (e) => {
		e.preventDefault();
		e.stopPropagation();
		addFilesToQueue(e.dataTransfer.files);
	};

	const onDragOver = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};

	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="font-display text-3xl font-bold">AI Knowledge Base</h1>
				<p className="mt-1 text-muted-foreground">
					Choose files, review the queue, then use <strong>Send to pipeline</strong> to post them to n8n.
					Requests go through PayPill (<code className="text-xs">/api/admin/knowledge-base/document</code>)
					so the browser never calls the webhook directly. History below is loaded from server records.
				</p>
			</div>

			<input
				ref={inputRef}
				type="file"
				multiple
				className="hidden"
				accept={ACCEPT}
				disabled={isUploading}
				onChange={onInputChange}
			/>

			<Card className="overflow-hidden border border-border shadow-sm">
				<CardContent className="p-0">
					<div
						className={cn(
							'file-upload-zone relative border-b border-border/80 bg-muted/20',
							isUploading && 'pointer-events-none opacity-80',
						)}
						onDrop={onDrop}
						onDragOver={onDragOver}
						role="presentation"
					>
						<div className="flex flex-col items-center py-10 px-4 text-center">
							<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background text-primary shadow-sm">
								{isUploading ? (
									<Loader2 className="h-8 w-8 animate-spin" />
								) : (
									<UploadCloud className="h-8 w-8" />
								)}
							</div>
							<h3 className="text-lg font-bold">
								{isUploading ? 'Sending to pipeline…' : 'Add documents'}
							</h3>
							<p className="mt-1 max-w-md text-sm text-muted-foreground">
								Drag and drop here, or click below. PDF only — max 50MB per file.
							</p>
							<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
								<Button
									type="button"
									variant="outline"
									disabled={isUploading}
									onClick={() => inputRef.current?.click()}
								>
									<UploadCloud className="mr-2 h-4 w-4" />
									Choose files
								</Button>
								<Button
									type="button"
									disabled={isUploading || pendingFiles.length === 0}
									onClick={sendPipeline}
									className="gap-2"
								>
									{isUploading ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Sending…
										</>
									) : (
										<>
											<Send className="h-4 w-4" />
											Send to pipeline
										</>
									)}
								</Button>
							</div>
							{pendingFiles.length > 0 && (
								<p className="mt-3 text-xs text-muted-foreground">
									{pendingFiles.length} file{pendingFiles.length === 1 ? '' : 's'} queued — click{' '}
									<strong>Send to pipeline</strong> when ready.
								</p>
							)}
						</div>
					</div>

					{pendingFiles.length > 0 && (
						<div className="border-b border-border bg-card px-4 py-3">
							<div className="mb-2 flex items-center justify-between">
								<span className="text-sm font-medium">Queued for upload</span>
								<Button type="button" variant="ghost" size="sm" onClick={clearPending} disabled={isUploading}>
									Clear queue
								</Button>
							</div>
							<ul className="max-h-48 space-y-2 overflow-y-auto">
								{pendingFiles.map((file, index) => (
									<li
										key={`${file.name}-${file.size}-${index}`}
										className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm"
									>
										<span className="min-w-0 truncate font-medium">{file.name}</span>
										<div className="flex shrink-0 items-center gap-2">
											<span className="text-xs text-muted-foreground">
												{(file.size / 1024).toFixed(1)} KB
											</span>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												disabled={isUploading}
												onClick={() => removePending(index)}
												aria-label={`Remove ${file.name}`}
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									</li>
								))}
							</ul>
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="border-none bg-card shadow-sm">
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b border-border/50 pb-4">
					<div>
						<CardTitle className="text-lg">Recent uploads (server)</CardTitle>
						<CardDescription>
							Uploaded file metadata in Supabase; deleting removes storage + vector chunks for that upload ID.
						</CardDescription>
					</div>
					<Button type="button" variant="outline" size="sm" onClick={loadRecentFromServer}>
						Refresh
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					{recent.length === 0 ? (
						<div className="p-10 text-center text-muted-foreground">
							No uploads recorded yet. Successful and failed sends appear here.
						</div>
					) : (
						<ul className="divide-y divide-border">
							{recent.map((row) => (
								<li
									key={row.id}
									className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-muted/30"
								>
									<div className="flex min-w-0 flex-1 items-start gap-3">
										<FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
										<div className="min-w-0">
											<p className="truncate font-medium">{row.fileName}</p>
											<p className="text-xs text-muted-foreground">
												{format(new Date(row.sentAt), 'MMM d, yyyy HH:mm')}
												{typeof row.size === 'number' ? ` · ${(row.size / 1024).toFixed(1)} KB` : ''}
											</p>
											{row.error && <p className="mt-1 text-xs text-destructive">{row.error}</p>}
										</div>
									</div>
									<div className="flex shrink-0 items-center gap-2">
										{row.uploadedFileId && (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-9 w-9 text-muted-foreground hover:text-destructive"
												onClick={() => deleteUploadedFile(row.uploadedFileId)}
												aria-label={`Delete ${row.fileName}`}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										)}
										{row.success ? (
											<CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Sent" />
										) : (
											<XCircle className="h-5 w-5 text-destructive" aria-label="Failed" />
										)}
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

