import React, { useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, Download, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} props.templateKind — bulk template kind (employees, providers, …)
 * @param {string} props.uploadPath — POST path under API base, e.g. /admin/bulk/employees
 * @param {React.ReactNode} [props.children] — extra fields appended to FormData (controls must have form="bulk-import-form-id")
 * @param {string} [props.formId]
 */
export default function BulkImportPanel({
	title,
	description,
	templateKind,
	uploadPath,
	children,
	formId = 'bulk-import-form',
}) {
	const fileRef = useRef(null);
	const [file, setFile] = useState(null);
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState(null);
	const [dragOver, setDragOver] = useState(false);

	const sheetSharingText = useMemo(() => {
		const rows = result?.sheetCredentials;
		if (!Array.isArray(rows) || rows.length === 0) return '';
		return rows
			.map(
				(r) =>
					`Row ${r.rowNumber}\nEmail: ${r.email}\nPassword (from file): ${r.spreadsheetPassword}`,
			)
			.join('\n\n');
	}, [result]);

	const copyToClipboard = async (text, successMessage) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(successMessage || 'Copied');
		} catch (e) {
			console.error(e);
			toast.error('Could not copy (clipboard blocked or denied).');
		}
	};

	const authHeaders = async () => {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		const token = session?.access_token;
		return token ? { Authorization: `Bearer ${token}` } : {};
	};

	const handleDownloadTemplate = async () => {
		try {
			const res = await apiServerClient.fetch(`/admin/bulk/template?kind=${encodeURIComponent(templateKind)}`, {
				headers: await authHeaders(),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Download failed');
			}
			const blob = await res.blob();
			const cd = res.headers.get('Content-Disposition');
			let filename = `template-${templateKind}.csv`;
			const m = cd && /filename="([^"]+)"/.exec(cd);
			if (m) filename = m[1];
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
			toast.success('Template downloaded');
		} catch (e) {
			console.error(e);
			toast.error(e.message || 'Could not download template');
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!file) {
			toast.error('Choose a CSV or Excel file');
			return;
		}
		setBusy(true);
		setResult(null);
		try {
			const fd = new FormData(e.target);
			fd.set('file', file);
			const res = await apiServerClient.fetch(uploadPath, {
				method: 'POST',
				headers: await authHeaders(),
				body: fd,
				timeoutMs: 120_000,
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data.error || res.statusText);
			}
			setResult(data);
			const n = data.successCount ?? 0;
			toast.success(
				n && Array.isArray(data.sheetCredentials) && data.sheetCredentials.length
					? `Imported ${n} row(s). Copy initial passwords below — they are not stored here.`
					: `Imported ${n} row(s)`,
			);
		} catch (err) {
			console.error(err);
			toast.error(err.message || 'Import failed');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
				<div>
					<h2 className="text-xl font-semibold">{title}</h2>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
				<Button type="button" variant="outline" onClick={handleDownloadTemplate} className="gap-2 shrink-0">
					<Download className="w-4 h-4" /> Download template
				</Button>
			</div>

			<form id={formId} onSubmit={handleSubmit} className="space-y-4">
				{children}

				<Card
					className={`border-2 border-dashed border-primary/20 bg-primary/5 transition-colors ${
						dragOver ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-primary/10'
					}`}
					onDragOver={(e) => {
						e.preventDefault();
						setDragOver(true);
					}}
					onDragLeave={() => setDragOver(false)}
					onDrop={(e) => {
						e.preventDefault();
						setDragOver(false);
						const f = e.dataTransfer?.files?.[0];
						if (f) {
							setFile(f);
							setResult(null);
						}
					}}
				>
					<CardContent className="flex flex-col items-center justify-center p-10 text-center">
						<div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
							<UploadCloud className="w-7 h-7" />
						</div>
						<p className="text-sm font-medium text-foreground mb-1">Drag & drop or browse</p>
						<p className="text-xs text-muted-foreground mb-4">.csv or .xlsx up to 10MB — use the template headers exactly.</p>
						<input
							ref={fileRef}
							type="file"
							accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
							className="hidden"
							onChange={(ev) => {
								setFile(ev.target.files?.[0] ?? null);
								setResult(null);
							}}
						/>
						<Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
							Browse files
						</Button>
						{file && (
							<p className="text-sm text-muted-foreground mt-3">
								Selected: <span className="font-medium text-foreground">{file.name}</span>
							</p>
						)}
					</CardContent>
				</Card>

				<Button type="submit" disabled={busy || !file} className="gap-2">
					{busy ? (
						<>
							<Loader2 className="w-4 h-4 animate-spin" /> Importing…
						</>
					) : (
						'Run import'
					)}
				</Button>
			</form>

			{result && (
				<div className="space-y-2">
					<p className="text-sm font-medium">
						Success: {result.successCount ?? 0} · Failed: {(result.failures || []).length}
					</p>
					{Array.isArray(result.sheetCredentials) && result.sheetCredentials.length > 0 && (
						<div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-3">
							<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
								<div>
									<p className="text-sm font-medium text-foreground">Initial passwords from your file</p>
									<p className="text-xs text-muted-foreground mt-1">
										Same values used to create accounts. Copy now — they are not kept on this screen after refresh.
									</p>
								</div>
								<Button
									type="button"
									size="sm"
									variant="default"
									className="gap-2 shrink-0"
									onClick={() =>
										void copyToClipboard(
											sheetSharingText,
											`${result.sheetCredentials.length} row(s) copied`,
										)
									}
								>
									<Copy className="w-4 h-4" />
									Copy all
								</Button>
							</div>
							<div className="rounded-md border bg-background overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-20">Row</TableHead>
											<TableHead>Email</TableHead>
											<TableHead>Password (from file)</TableHead>
											<TableHead className="w-[140px]" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{result.sheetCredentials.map((r) => (
											<TableRow key={`${r.rowNumber}-${r.email}`}>
												<TableCell>{r.rowNumber}</TableCell>
												<TableCell className="font-mono text-xs max-w-[200px] break-all">
													{r.email}
												</TableCell>
												<TableCell className="font-mono text-xs max-w-[200px] break-all">
													{r.spreadsheetPassword}
												</TableCell>
												<TableCell>
													<Button
														type="button"
														size="sm"
														variant="outline"
														className="gap-1 h-8"
														onClick={() =>
															void copyToClipboard(
																`${r.email}\t${r.spreadsheetPassword}`,
																'Copied email and password',
															)
														}
													>
														<Copy className="w-3 h-3" />
														Copy
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					)}
					{(result.failures || []).length > 0 && (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-24">Row</TableHead>
										<TableHead>Error</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{result.failures.map((f, i) => (
										<TableRow key={i}>
											<TableCell>{f.rowNumber}</TableCell>
											<TableCell className="text-destructive">{f.message}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
