import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import DataTable from '@/components/DataTable.jsx';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { toast } from 'sonner';
import { ArrowLeft, Download, Upload } from 'lucide-react';

function catalogKindFromPath(pathname) {
	if (pathname.includes('/settings/catalog/labs')) return 'labs';
	if (pathname.includes('/settings/catalog/services')) return 'services';
	return 'drugs';
}

const TEMPLATES = {
	drugs: `[
  { "name": "Metformin", "default_strength": "500 mg", "default_route": "oral", "default_frequency": "twice daily", "default_duration_days": 90, "default_quantity": 180, "default_refills": 3, "notes": "" },
  { "name": "Lisinopril", "default_strength": "10 mg", "default_route": "oral", "default_frequency": "once daily", "default_duration_days": 30, "default_quantity": 30, "default_refills": 5, "notes": "" }
]`,
	labs: `[
  { "test_name": "Complete blood count", "code": "CBC", "category": "Hematology", "notes": "" },
  { "test_name": "Comprehensive metabolic panel", "code": "CMP", "category": "Chemistry", "notes": "" }
]`,
	services: `[
  { "name": "New patient visit", "price": 200, "notes": "", "unit": "per_visit", "category": "service" },
  { "name": "Follow-up visit", "price": 120, "notes": "", "unit": "per_visit", "category": "service" }
]`,
};

export default function ProviderSettingsCatalogPage() {
	const location = useLocation();
	const kind = catalogKindFromPath(location.pathname);

	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [bulkJson, setBulkJson] = useState('');
	const [replaceAll, setReplaceAll] = useState(false);
	const [importing, setImporting] = useState(false);

	const apiPath = kind === 'labs' ? '/provider/catalog/labs' : kind === 'services' ? '/provider/catalog/services' : '/provider/catalog/drugs';

	const title =
		kind === 'labs' ? 'Laboratory test catalog' : kind === 'services' ? 'Services catalog' : 'Drug formulary';
	const description =
		kind === 'labs'
			? 'Tests your clinicians can order during consultations. Bulk import JSON below.'
			: kind === 'services'
				? 'Billable services for your practice. Imports append to your existing list.'
				: 'Medications available for quick-pick during consultations. Use replace to wipe and reload.';

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch(apiPath);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load');
			setItems(Array.isArray(body.items) ? body.items : []);
		} catch (e) {
			toast.error(e.message || 'Failed to load');
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [apiPath]);

	useEffect(() => {
		void load();
	}, [load]);

	const columns = useMemo(() => {
		if (kind === 'labs') {
			return [
				{ header: 'Test', accessorKey: 'test_name', cell: (row) => <span className="font-medium">{row.test_name}</span> },
				{ header: 'Code', accessorKey: 'code', cell: (row) => row.code || '—' },
				{ header: 'Category', accessorKey: 'category', cell: (row) => row.category || '—' },
				{ header: 'Notes', accessorKey: 'notes', cell: (row) => <span className="text-sm text-muted-foreground line-clamp-2">{row.notes || '—'}</span> },
			];
		}
		if (kind === 'services') {
			return [
				{ header: 'Service', accessorKey: 'name', cell: (row) => <span className="font-medium">{row.name}</span> },
				{ header: 'Unit', accessorKey: 'unit', cell: (row) => row.unit || '—' },
				{ header: 'Price', accessorKey: 'price', cell: (row) => (row.price != null ? `$${Number(row.price).toFixed(2)}` : '—') },
				{ header: 'Notes', accessorKey: 'notes', cell: (row) => <span className="text-sm text-muted-foreground line-clamp-2">{row.notes || '—'}</span> },
			];
		}
		return [
			{ header: 'Medication', accessorKey: 'name', cell: (row) => <span className="font-medium">{row.name}</span> },
			{ header: 'Strength', accessorKey: 'default_strength', cell: (row) => row.default_strength || '—' },
			{ header: 'Route', accessorKey: 'default_route', cell: (row) => row.default_route || '—' },
			{ header: 'Frequency', accessorKey: 'default_frequency', cell: (row) => row.default_frequency || '—' },
			{ header: 'Notes', accessorKey: 'notes', cell: (row) => <span className="text-sm text-muted-foreground line-clamp-2">{row.notes || '—'}</span> },
		];
	}, [kind]);

	const tableData = useMemo(() => items.map((row, i) => ({ ...row, id: row.id || `${kind}-${i}` })), [items, kind]);

	const downloadTemplate = () => {
		const blob = new Blob([TEMPLATES[kind]], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `paypill-catalog-${kind}-template.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const runImport = async () => {
		let parsed;
		try {
			parsed = JSON.parse(bulkJson.trim() || '[]');
		} catch {
			toast.error('Invalid JSON. Fix syntax or paste a valid array.');
			return;
		}
		if (!Array.isArray(parsed) || parsed.length === 0) {
			toast.error('JSON must be a non-empty array of objects.');
			return;
		}
		setImporting(true);
		try {
			const body =
				kind === 'services'
					? { items: parsed }
					: { items: parsed, replace: replaceAll };
			const res = await apiServerClient.fetch(apiPath, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const out = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(out.error || 'Import failed');
			toast.success(`Imported ${out.imported ?? parsed.length} row(s).`);
			setBulkJson('');
			await load();
		} catch (e) {
			toast.error(e.message || 'Import failed');
		} finally {
			setImporting(false);
		}
	};

	return (
		<div className="space-y-8 max-w-5xl">
			<Helmet>
				<title>{title} — Provider</title>
			</Helmet>
			<Button variant="ghost" className="-ml-2 text-muted-foreground" asChild>
				<Link to="/provider/settings">
					<ArrowLeft className="h-4 w-4 mr-1 inline" />
					Back to settings
				</Link>
			</Button>
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{title}</h1>
				<p className="text-muted-foreground mt-1 max-w-3xl">{description}</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Current entries</CardTitle>
					<CardDescription>Synced with your linked practice organization.</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? <LoadingSpinner /> : <DataTable columns={columns} data={tableData} loading={false} emptyMessage="No catalog rows yet." />}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Bulk upload (JSON)</CardTitle>
					<CardDescription>
						Paste a JSON array of objects. Download a starter file, edit offline, then import here.
						{kind !== 'services' ? ' Replace all clears existing rows for this catalog before insert.' : ' Service imports always append.'}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
							<Download className="h-4 w-4 mr-1.5" />
							Download template
						</Button>
					</div>
					{kind !== 'services' ? (
						<div className="flex items-center gap-2">
							<Checkbox id="replace" checked={replaceAll} onCheckedChange={(v) => setReplaceAll(v === true)} />
							<Label htmlFor="replace" className="text-sm font-normal cursor-pointer">
								Replace entire catalog (dangerous — removes current rows for {kind === 'labs' ? 'lab tests' : 'drugs'})
							</Label>
						</div>
					) : null}
					<div className="space-y-2">
						<Label htmlFor="bulk">JSON array</Label>
						<Textarea
							id="bulk"
							rows={12}
							className="font-mono text-sm"
							placeholder="[ { ... }, { ... } ]"
							value={bulkJson}
							onChange={(e) => setBulkJson(e.target.value)}
						/>
					</div>
					<Button type="button" onClick={() => void runImport()} disabled={importing || !bulkJson.trim()}>
						<Upload className="h-4 w-4 mr-1.5" />
						{importing ? 'Importing…' : 'Import'}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
