import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { ProviderDataTable } from '@/components/provider/ProviderDataTable.jsx';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { ArrowLeft, Download, Pencil, Plus, Trash2, Upload } from 'lucide-react';

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

const emptyDrugForm = () => ({
	name: '',
	default_strength: '',
	default_route: 'oral',
	default_frequency: '',
	default_duration_days: '',
	default_quantity: '',
	default_refills: '0',
	notes: '',
	sort_order: '0',
});

const emptyLabForm = () => ({
	test_name: '',
	code: '',
	category: '',
	notes: '',
	sort_order: '0',
});

const emptySvcForm = () => ({
	name: '',
	price: '0',
	unit: 'per_visit',
	category: 'service',
	notes: '',
	sort_order: '0',
});

export default function ProviderSettingsCatalogPage() {
	const location = useLocation();
	const kind = catalogKindFromPath(location.pathname);

	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [bulkJson, setBulkJson] = useState('');
	const [replaceAll, setReplaceAll] = useState(false);
	const [importing, setImporting] = useState(false);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [drugForm, setDrugForm] = useState(emptyDrugForm);
	const [labForm, setLabForm] = useState(emptyLabForm);
	const [svcForm, setSvcForm] = useState(emptySvcForm);
	const [savingForm, setSavingForm] = useState(false);

	const apiPath = kind === 'labs' ? '/provider/catalog/labs' : kind === 'services' ? '/provider/catalog/services' : '/provider/catalog/drugs';

	const title =
		kind === 'labs' ? 'Laboratory test catalog' : kind === 'services' ? 'Services catalog' : 'Drug formulary';
	const description =
		kind === 'labs'
			? 'Tests your clinicians can order during consultations. Add rows manually or import JSON.'
			: kind === 'services'
				? 'Billable services for your practice. Add manually or bulk-import JSON (append).'
				: 'Medications for quick-pick during consultations. Add manually, import JSON, or replace the whole list.';

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

	const openCreate = () => {
		setEditingId(null);
		setDrugForm(emptyDrugForm());
		setLabForm(emptyLabForm());
		setSvcForm(emptySvcForm());
		setDialogOpen(true);
	};

	const openEdit = (row) => {
		setEditingId(row.id);
		if (kind === 'drugs') {
			setDrugForm({
				name: row.name || '',
				default_strength: row.default_strength || '',
				default_route: row.default_route || 'oral',
				default_frequency: row.default_frequency || '',
				default_duration_days: row.default_duration_days != null ? String(row.default_duration_days) : '',
				default_quantity: row.default_quantity != null ? String(row.default_quantity) : '',
				default_refills: row.default_refills != null ? String(row.default_refills) : '0',
				notes: row.notes || '',
				sort_order: row.sort_order != null ? String(row.sort_order) : '0',
			});
		} else if (kind === 'labs') {
			setLabForm({
				test_name: row.test_name || '',
				code: row.code || '',
				category: row.category || '',
				notes: row.notes || '',
				sort_order: row.sort_order != null ? String(row.sort_order) : '0',
			});
		} else {
			setSvcForm({
				name: row.name || '',
				price: row.price != null ? String(row.price) : '0',
				unit: row.unit || 'per_visit',
				category: row.category || 'service',
				notes: row.notes || '',
				sort_order: row.sort_order != null ? String(row.sort_order) : '0',
			});
		}
		setDialogOpen(true);
	};

	const saveForm = async () => {
		setSavingForm(true);
		try {
			if (kind === 'drugs') {
				const payload = {
					name: drugForm.name.trim(),
					default_strength: drugForm.default_strength.trim() || null,
					default_route: drugForm.default_route.trim() || null,
					default_frequency: drugForm.default_frequency.trim() || null,
					default_duration_days: drugForm.default_duration_days ? Number(drugForm.default_duration_days) : null,
					default_quantity: drugForm.default_quantity ? Number(drugForm.default_quantity) : null,
					default_refills: drugForm.default_refills ? Number(drugForm.default_refills) : 0,
					notes: drugForm.notes.trim() || null,
					sort_order: drugForm.sort_order ? Number(drugForm.sort_order) : 0,
				};
				if (!payload.name) {
					toast.error('Medication name is required');
					return;
				}
				if (editingId) {
					const res = await apiServerClient.fetch(`${apiPath}/${encodeURIComponent(editingId)}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(payload),
					});
					const body = await res.json().catch(() => ({}));
					if (!res.ok) throw new Error(body.error || 'Save failed');
					toast.success('Drug updated.');
				} else {
					const res = await apiServerClient.fetch(apiPath, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ item: payload }),
					});
					const body = await res.json().catch(() => ({}));
					if (!res.ok) throw new Error(body.error || 'Save failed');
					toast.success('Drug added.');
				}
			} else if (kind === 'labs') {
				const payload = {
					test_name: labForm.test_name.trim(),
					code: labForm.code.trim() || null,
					category: labForm.category.trim() || null,
					notes: labForm.notes.trim() || null,
					sort_order: labForm.sort_order ? Number(labForm.sort_order) : 0,
				};
				if (!payload.test_name) {
					toast.error('Test name is required');
					return;
				}
				if (editingId) {
					const res = await apiServerClient.fetch(`${apiPath}/${encodeURIComponent(editingId)}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(payload),
					});
					const body = await res.json().catch(() => ({}));
					if (!res.ok) throw new Error(body.error || 'Save failed');
					toast.success('Lab test updated.');
				} else {
					const res = await apiServerClient.fetch(apiPath, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ item: payload }),
					});
					const body = await res.json().catch(() => ({}));
					if (!res.ok) throw new Error(body.error || 'Save failed');
					toast.success('Lab test added.');
				}
			} else {
				const price = Number(svcForm.price);
				const payload = {
					name: svcForm.name.trim(),
					price: Number.isFinite(price) ? Math.max(0, price) : 0,
					unit: svcForm.unit.trim() || 'per_visit',
					category: svcForm.category.trim() || 'service',
					notes: svcForm.notes.trim() || null,
					sort_order: svcForm.sort_order ? Number(svcForm.sort_order) : 0,
				};
				if (!payload.name) {
					toast.error('Service name is required');
					return;
				}
				if (editingId) {
					const res = await apiServerClient.fetch(`${apiPath}/${encodeURIComponent(editingId)}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(payload),
					});
					const body = await res.json().catch(() => ({}));
					if (!res.ok) throw new Error(body.error || 'Save failed');
					toast.success('Service updated.');
				} else {
					const res = await apiServerClient.fetch(apiPath, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ item: payload }),
					});
					const body = await res.json().catch(() => ({}));
					if (!res.ok) throw new Error(body.error || 'Save failed');
					toast.success('Service added.');
				}
			}
			setDialogOpen(false);
			await load();
		} catch (e) {
			toast.error(e.message || 'Save failed');
		} finally {
			setSavingForm(false);
		}
	};

	const deleteRow = async (id) => {
		if (!window.confirm('Delete this row permanently?')) return;
		try {
			const res = await apiServerClient.fetch(`${apiPath}/${encodeURIComponent(id)}`, { method: 'DELETE' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Delete failed');
			toast.success('Deleted.');
			await load();
		} catch (e) {
			toast.error(e.message || 'Delete failed');
		}
	};

	const columns = (() => {
		const actions = {
			key: 'actions',
			label: '',
			sortable: false,
			className: 'w-[120px]',
			render: (row) => (
				<div className="flex gap-1 justify-end">
					<Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => void deleteRow(row.id)}>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			),
		};
		if (kind === 'labs') {
			return [
				{ key: 'test_name', label: 'Test', sortable: true, render: (row) => <span className="font-medium">{row.test_name}</span> },
				{ key: 'code', label: 'Code', sortable: true, render: (row) => row.code || '—' },
				{ key: 'category', label: 'Category', sortable: true, render: (row) => row.category || '—' },
				{
					key: 'notes',
					label: 'Notes',
					sortable: false,
					render: (row) => <span className="text-sm text-muted-foreground line-clamp-2">{row.notes || '—'}</span>,
				},
				actions,
			];
		}
		if (kind === 'services') {
			return [
				{ key: 'name', label: 'Service', sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
				{ key: 'unit', label: 'Unit', sortable: true, render: (row) => row.unit || '—' },
				{
					key: 'price',
					label: 'Price',
					sortable: true,
					render: (row) => (row.price != null ? `$${Number(row.price).toFixed(2)}` : '—'),
				},
				{
					key: 'notes',
					label: 'Notes',
					sortable: false,
					render: (row) => <span className="text-sm text-muted-foreground line-clamp-2">{row.notes || '—'}</span>,
				},
				actions,
			];
		}
		return [
			{ key: 'name', label: 'Medication', sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
			{ key: 'default_strength', label: 'Strength', sortable: true, render: (row) => row.default_strength || '—' },
			{ key: 'default_route', label: 'Route', sortable: true, render: (row) => row.default_route || '—' },
			{ key: 'default_frequency', label: 'Frequency', sortable: true, render: (row) => row.default_frequency || '—' },
			{
				key: 'notes',
				label: 'Notes',
				sortable: false,
				render: (row) => <span className="text-sm text-muted-foreground line-clamp-2">{row.notes || '—'}</span>,
			},
			actions,
		];
	})();

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

	const dialogTitle = editingId ? 'Edit entry' : 'Add entry';

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
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{title}</h1>
					<p className="text-muted-foreground mt-1 max-w-3xl">{description}</p>
				</div>
				<Button type="button" onClick={openCreate} className="shrink-0">
					<Plus className="h-4 w-4 mr-1.5" />
					Add manually
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Current entries</CardTitle>
					<CardDescription>Click column headers to sort. Use edit or delete on each row.</CardDescription>
				</CardHeader>
				<CardContent>
					<ProviderDataTable columns={columns} data={items} isLoading={loading} emptyMessage="No catalog rows yet." getRowId={(r) => r.id} />
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

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{dialogTitle}</DialogTitle>
						<DialogDescription>{editingId ? 'Update fields and save.' : 'Fill in the fields to create a new catalog row.'}</DialogDescription>
					</DialogHeader>
					{kind === 'drugs' ? (
						<div className="grid gap-3 py-2">
							<div className="space-y-1">
								<Label>Medication name *</Label>
								<Input value={drugForm.name} onChange={(e) => setDrugForm((f) => ({ ...f, name: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Strength</Label>
								<Input value={drugForm.default_strength} onChange={(e) => setDrugForm((f) => ({ ...f, default_strength: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Route</Label>
								<Input value={drugForm.default_route} onChange={(e) => setDrugForm((f) => ({ ...f, default_route: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Frequency</Label>
								<Input value={drugForm.default_frequency} onChange={(e) => setDrugForm((f) => ({ ...f, default_frequency: e.target.value }))} />
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1">
									<Label>Duration (days)</Label>
									<Input
										inputMode="numeric"
										value={drugForm.default_duration_days}
										onChange={(e) => setDrugForm((f) => ({ ...f, default_duration_days: e.target.value }))}
									/>
								</div>
								<div className="space-y-1">
									<Label>Quantity</Label>
									<Input
										inputMode="numeric"
										value={drugForm.default_quantity}
										onChange={(e) => setDrugForm((f) => ({ ...f, default_quantity: e.target.value }))}
									/>
								</div>
							</div>
							<div className="space-y-1">
								<Label>Refills</Label>
								<Input inputMode="numeric" value={drugForm.default_refills} onChange={(e) => setDrugForm((f) => ({ ...f, default_refills: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Sort order</Label>
								<Input inputMode="numeric" value={drugForm.sort_order} onChange={(e) => setDrugForm((f) => ({ ...f, sort_order: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Notes</Label>
								<Textarea rows={2} value={drugForm.notes} onChange={(e) => setDrugForm((f) => ({ ...f, notes: e.target.value }))} />
							</div>
						</div>
					) : kind === 'labs' ? (
						<div className="grid gap-3 py-2">
							<div className="space-y-1">
								<Label>Test name *</Label>
								<Input value={labForm.test_name} onChange={(e) => setLabForm((f) => ({ ...f, test_name: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Code</Label>
								<Input value={labForm.code} onChange={(e) => setLabForm((f) => ({ ...f, code: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Category</Label>
								<Input value={labForm.category} onChange={(e) => setLabForm((f) => ({ ...f, category: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Sort order</Label>
								<Input inputMode="numeric" value={labForm.sort_order} onChange={(e) => setLabForm((f) => ({ ...f, sort_order: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Notes</Label>
								<Textarea rows={2} value={labForm.notes} onChange={(e) => setLabForm((f) => ({ ...f, notes: e.target.value }))} />
							</div>
						</div>
					) : (
						<div className="grid gap-3 py-2">
							<div className="space-y-1">
								<Label>Service name *</Label>
								<Input value={svcForm.name} onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Price (USD)</Label>
								<Input inputMode="decimal" value={svcForm.price} onChange={(e) => setSvcForm((f) => ({ ...f, price: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Unit</Label>
								<Input value={svcForm.unit} onChange={(e) => setSvcForm((f) => ({ ...f, unit: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Category</Label>
								<Input value={svcForm.category} onChange={(e) => setSvcForm((f) => ({ ...f, category: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Sort order</Label>
								<Input inputMode="numeric" value={svcForm.sort_order} onChange={(e) => setSvcForm((f) => ({ ...f, sort_order: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Notes</Label>
								<Textarea rows={2} value={svcForm.notes} onChange={(e) => setSvcForm((f) => ({ ...f, notes: e.target.value }))} />
							</div>
						</div>
					)}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
							Cancel
						</Button>
						<Button type="button" disabled={savingForm} onClick={() => void saveForm()}>
							{savingForm ? 'Saving…' : 'Save'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
