import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const KB_STORAGE_KEY = 'paypill-kb-recent-uploads';
const MAX_RECENT = 25;
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt';

function loadRecent() {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(KB_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function saveRecent(entries) {
	try {
		localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_RECENT)));
	} catch {
		/* ignore quota */
	}
}

/**
 * Admin AI Knowledge Base — upload files to the n8n document webhook (server-proxied).
 */
export default function KnowledgeBasePage() {
	const [recent, setRecent] = useState([]);
	const [isUploading, setIsUploading] = useState(false);
	const inputRef = useRef(null);

	useEffect(() => {
		setRecent(loadRecent());
	}, []);

	const pushRecent = useCallback((entry) => {
		setRecent((prev) => {
			const next = [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, MAX_RECENT);
			saveRecent(next);
			return next;
		});
	}, []);

	const uploadOne = async (file) => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const formData = new FormData();
		formData.append('file', file, file.name);

		const res = await apiServerClient.fetch('/api/admin/knowledge-base/document', {
			method: 'POST',
			body: formData,
			timeoutMs: 300_000,
		});

		let payload = null;
		try {
			payload = await res.json();
		} catch {
			payload = { error: await res.text() };
		}

		if (!res.ok || !payload?.ok) {
			const msg =
				(typeof payload === 'object' && payload && 'error' in payload && payload.error) ||
				`Upload failed (${res.status})`;
			throw new Error(typeof msg === 'string' ? msg : 'Upload failed');
		}

		pushRecent({
			id,
			fileName: file.name,
			size: file.size,
			sentAt: new Date().toISOString(),
			success: true,
		});
	};

	const handleFiles = async (fileList) => {
		const files = Array.from(fileList).filter((f) => f instanceof File);
		if (!files.length) return;

		for (const file of files) {
			if (file.size > MAX_FILE_BYTES) {
				toast.error(`${file.name} is over 50MB`);
				continue;
			}
		}

		const valid = files.filter((f) => f.size <= MAX_FILE_BYTES);
		if (!valid.length) return;

		setIsUploading(true);
		let ok = 0;
		for (const file of valid) {
			try {
				await uploadOne(file);
				ok++;
			} catch (e) {
				const id = `${Date.now()}-err-${Math.random().toString(36).slice(2, 8)}`;
				pushRecent({
					id,
					fileName: file.name,
					size: file.size,
					sentAt: new Date().toISOString(),
					success: false,
					error: e instanceof Error ? e.message : 'Failed',
				});
				toast.error(`${file.name}: ${e instanceof Error ? e.message : 'upload failed'}`);
			}
		}
		setIsUploading(false);
		if (ok > 0) {
			toast.success(
				ok === valid.length
					? `Sent ${ok} document${ok === 1 ? '' : 's'} to the indexing pipeline`
					: `Sent ${ok} of ${valid.length} document(s)`,
			);
		}
		if (inputRef.current) inputRef.current.value = '';
	};

	const onInputChange = (e) => {
		handleFiles(e.target.files);
	};

	const onDrop = (e) => {
		e.preventDefault();
		e.stopPropagation();
		handleFiles(e.dataTransfer.files);
	};

	const onDragOver = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const clearHistory = () => {
		saveRecent([]);
		setRecent([]);
		toast.message('Recent upload history cleared');
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-display text-3xl font-bold">AI Knowledge Base</h1>
				<p className="mt-1 text-muted-foreground">
					Upload documents from your computer. Files are sent securely through PayPill to your n8n
					indexing webhook — nothing is stored in this screen except a local history list on your
					browser.
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

			<div
				className="file-upload-zone relative overflow-hidden"
				onDrop={onDrop}
				onDragOver={onDragOver}
				role="presentation"
			>
				<button
					type="button"
					disabled={isUploading}
					className="absolute inset-0 z-10 cursor-pointer disabled:cursor-not-allowed"
					aria-label="Choose files to upload"
					onClick={() => inputRef.current?.click()}
				/>
				{isUploading ? (
					<div className="flex flex-col items-center text-primary">
						<Loader2 className="h-10 w-10 animate-spin" />
						<p className="mt-4 font-medium">Sending to pipeline…</p>
					</div>
				) : (
					<>
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background text-primary shadow-sm">
							<UploadCloud className="h-8 w-8" />
						</div>
						<h3 className="text-lg font-bold">Upload documents</h3>
						<p className="mt-1 max-w-md text-sm text-muted-foreground">
							Drag and drop files here, or click to browse. Formats: PDF, Word, Excel, CSV, text — max
							50MB per file.
						</p>
						<p className="mt-4 text-xs text-muted-foreground">
							Forwarded via{' '}
							<code className="rounded bg-muted px-1 py-0.5 text-[11px]">/api/admin/knowledge-base/document</code>{' '}
							to your n8n document webhook.
						</p>
					</>
				)}
			</div>

			<Card className="border-none bg-card shadow-sm">
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b border-border/50 pb-4">
					<div>
						<CardTitle className="text-lg">Recent uploads (this browser)</CardTitle>
						<CardDescription>
							Stored in <code className="text-xs">localStorage</code> for your convenience — not synced to
							the server.
						</CardDescription>
					</div>
					{recent.length > 0 && (
						<Button type="button" variant="outline" size="sm" onClick={clearHistory}>
							Clear history
						</Button>
					)}
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
									{row.success ? (
										<CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Sent" />
									) : (
										<XCircle className="h-5 w-5 shrink-0 text-destructive" aria-label="Failed" />
									)}
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
