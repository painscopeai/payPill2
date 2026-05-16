import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import ServiceFormLinks from '@/components/provider/ServiceFormLinks.jsx';
import apiServerClient from '@/lib/apiServerClient';
import { parseSimpleCsv } from '@/lib/parseSimpleCsv.js';
import { toast } from 'sonner';
import { ArrowLeft, Download, Package, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { TableRowActionsMenu } from '@/components/TableRowActionsMenu.jsx';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

function catalogKindFromPath(pathname) {
	if (pathname.includes('/settings/catalog/labs')) return 'labs';
	if (pathname.includes('/settings/catalog/services')) return 'services';
	return 'drugs';
}

const TEMPLATES = {
	drugs: `[
  { "name": "Metformin", "default_strength": "500 mg", "default_route": "oral", "default_frequency": "twice daily", "default_duration_days": 90, "default_quantity": 180, "default_refills": 3, "unit_price": 12, "currency": "USD", "quantity_on_hand": 200, "low_stock_threshold": 40, "notes": "" },
  { "name": "Lisinopril", "default_strength": "10 mg", "default_route": "oral", "default_frequency": "once daily", "default_duration_days": 30, "default_quantity": 30, "default_refills": 5, "unit_price": 8, "currency": "USD", "quantity_on_hand": 150, "low_stock_threshold": 30, "notes": "" }
]`,
	labs: `[
  { "test_name": "Complete blood count", "code": "CBC", "category": "Hematology", "list_price": 45, "currency": "USD", "notes": "" },
  { "test_name": "Comprehensive metabolic panel", "code": "CMP", "category": "Chemistry", "list_price": 55, "currency": "USD", "notes": "" }
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
	unit_price: '0',
	currency: 'USD',
	quantity_on_hand: '0',
	low_stock_threshold: '',
});

const emptyLabForm = () => ({
	test_name: '',
	code: '',
	category: '',
	notes: '',
	sort_order: '0',
	list_price: '0',
	currency: 'USD',
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

	const [providerPortalForms, setProviderPortalForms] = useState([]);
	const [formsAttachOpen, setFormsAttachOpen] = useState(false);
	const [formsAttachRow, setFormsAttachRow] = useState(null);
	const [attachConsentId, setAttachConsentId] = useState('__none__');
	const [attachIntakeId, setAttachIntakeId] = useState('__none__');
	const [savingAttachments, setSavingAttachments] = useState(false);

	const csvInputRef = useRef(null);
	const [csvImporting, setCsvImporting] = useState(false);
	const [practiceRoleSlug, setPracticeRoleSlug] = useState(null);
	const [stockDialog, setStockDialog] = useState({
		open: false,
		row: null,
		mode: 'restock',
		delta: '',
		notes: '',
	});

	const apiPathBase =
		kind === 'labs' ? '/provider/catalog/labs' : kind === 'services' ? '/provider/catalog/services' : '/provider/catalog/drugs';
	const apiPath = kind === 'drugs' ? `${apiPathBase}?manage=1` : apiPathBase;

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

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await apiServerClient.fetch('/provider/practice-context');
				const body = await res.json().catch(() => ({}));
				if (!cancelled && res.ok) {
					setPracticeRoleSlug(body.practice_role_slug || null);
				}
			} catch {
				if (!cancelled) setPracticeRoleSlug(null);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (kind !== 'services') return;
		let cancelled = false;
		(async () => {
			try {
				const res = await apiServerClient.fetch('/provider/forms?limit=200');
				const body = await res.json().catch(() => ({}));
				if (!res.ok || cancelled) return;
				setProviderPortalForms(Array.isArray(body.items) ? body.items : []);
			} catch {
				if (!cancelled) setProviderPortalForms([]);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [kind]);

	const openFormsAttach = (row) => {
		setFormsAttachRow(row);
		setAttachConsentId(row.consentForm?.id || '__none__');
		setAttachIntakeId(row.intakeForm?.id || '__none__');
		setFormsAttachOpen(true);
	};

	const saveFormsAttach = async () => {
		if (!formsAttachRow?.id) return;
		setSavingAttachments(true);
		try {
			const consentFormId = attachConsentId === '__none__' ? null : attachConsentId;
			const intakeFormId = attachIntakeId === '__none__' ? null : attachIntakeId;
			const res = await apiServerClient.fetch(`/provider/catalog/services/${encodeURIComponent(formsAttachRow.id)}/forms`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ consentFormId, intakeFormId }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Save failed');
			toast.success('Service forms updated.');
			setFormsAttachOpen(false);
			setFormsAttachRow(null);
			await load();
		} catch (e) {
			toast.error(e.message || 'Save failed');
		} finally {
			setSavingAttachments(false);
		}
	};

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
				unit_price: row.unit_price != null ? String(row.unit_price) : '0',
				currency: row.currency || 'USD',
				quantity_on_hand: row.quantity_on_hand != null ? String(row.quantity_on_hand) : '0',
				low_stock_threshold: row.low_stock_threshold != null ? String(row.low_stock_threshold) : '',
			});
		} else if (kind === 'labs') {
			setLabForm({
				test_name: row.test_name || '',
				code: row.code || '',
				category: row.category || '',
				notes: row.notes || '',
				sort_order: row.sort_order != null ? String(row.sort_order) : '0',
				list_price: row.list_price != null ? String(row.list_price) : '0',
				currency: row.currency || 'USD',
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
				const up = Number(drugForm.unit_price);
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
					unit_price: Number.isFinite(up) ? Math.max(0, up) : 0,
					currency: (drugForm.currency || 'USD').trim().toUpperCase() || 'USD',
					quantity_on_hand: drugForm.quantity_on_hand ? Number(drugForm.quantity_on_hand) : 0,
					low_stock_threshold:
						drugForm.low_stock_threshold === '' || drugForm.low_stock_threshold == null
							? null
							: Math.max(0, Math.floor(Number(drugForm.low_stock_threshold))),
				};
				if (!payload.name) {
					toast.error('Medication name is required');
					return;
				}
				if (editingId) {
					const res = await apiServerClient.fetch(`${apiPathBase}/${encodeURIComponent(editingId)}`, {
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
				const lp = Number(labForm.list_price);
				const payload = {
					test_name: labForm.test_name.trim(),
					code: labForm.code.trim() || null,
					category: labForm.category.trim() || null,
					notes: labForm.notes.trim() || null,
					sort_order: labForm.sort_order ? Number(labForm.sort_order) : 0,
					list_price: Number.isFinite(lp) ? Math.max(0, lp) : 0,
					currency: (labForm.currency || 'USD').trim().toUpperCase() || 'USD',
				};
				if (!payload.test_name) {
					toast.error('Test name is required');
					return;
				}
				if (editingId) {
					const res = await apiServerClient.fetch(`${apiPathBase}/${encodeURIComponent(editingId)}`, {
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
					const res = await apiServerClient.fetch(`${apiPathBase}/${encodeURIComponent(editingId)}`, {
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
			const res = await apiServerClient.fetch(`${apiPathBase}/${encodeURIComponent(id)}`, { method: 'DELETE' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Delete failed');
			toast.success('Deleted.');
			await load();
		} catch (e) {
			toast.error(e.message || 'Delete failed');
		}
	};

	const openStockDialog = (row, mode) => {
		setStockDialog({
			open: true,
			row,
			mode: mode === 'adjustment' ? 'adjustment' : 'restock',
			delta: mode === 'restock' ? '10' : '-1',
			notes: '',
		});
	};

	const submitStockMove = async () => {
		const row = stockDialog.row;
		if (!row?.id) return;
		const delta = Number(stockDialog.delta);
		if (!Number.isFinite(delta) || delta === 0) {
			toast.error('Enter a non-zero change');
			return;
		}
		if (stockDialog.mode === 'restock' && delta < 0) {
			toast.error('Restock must be positive');
			return;
		}
		try {
			const res = await apiServerClient.fetch('/provider/inventory/pharmacy/move', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drug_catalog_id: row.id,
					delta_qty: stockDialog.mode === 'restock' ? Math.abs(Math.trunc(delta)) : Math.trunc(delta),
					reason: stockDialog.mode,
					notes: stockDialog.notes.trim() || null,
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Update failed');
			toast.success('Stock updated.');
			setStockDialog((s) => ({ ...s, open: false, row: null }));
			await load();
		} catch (e) {
			toast.error(e.message || 'Update failed');
		}
	};

	const columns = (() => {
		const actions = {
			key: 'actions',
			label: '',
			sortable: false,
			className: 'w-[72px]',
			render: (row) => (
				<div className="flex justify-end">
					<TableRowActionsMenu
						items={[
							...(kind === 'drugs' && practiceRoleSlug === 'pharmacist'
								? [
										{
											label: 'Adjust stock',
											icon: Package,
											onClick: () => openStockDialog(row, 'restock'),
										},
									]
								: []),
							{
								label: 'Edit',
								icon: Pencil,
								onClick: () => openEdit(row),
								separatorBefore: kind === 'drugs' && practiceRoleSlug === 'pharmacist',
							},
							{
								label: 'Delete',
								icon: Trash2,
								onClick: () => void deleteRow(row.id),
								destructive: true,
								separatorBefore: true,
							},
						]}
					/>
				</div>
			),
		};
		if (kind === 'labs') {
			return [
				{ key: 'test_name', label: 'Test', sortable: true, render: (row) => <span className="font-medium">{row.test_name}</span> },
				{ key: 'code', label: 'Code', sortable: true, render: (row) => row.code || '—' },
				{ key: 'category', label: 'Category', sortable: true, render: (row) => row.category || '—' },
				{
					key: 'list_price',
					label: 'Price',
					sortable: true,
					render: (row) => (row.list_price != null ? `$${Number(row.list_price).toFixed(2)}` : '—'),
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
					key: 'patientForms',
					label: 'Patient forms',
					sortable: false,
					className: 'min-w-[11rem]',
					render: (row) => (
						<div className="space-y-2 py-1">
							<ServiceFormLinks serviceId={row.id} />
							<Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => openFormsAttach(row)}>
								Assign forms…
							</Button>
						</div>
					),
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
			{
				key: 'unit_price',
				label: 'Unit $',
				sortable: true,
				render: (row) => (row.unit_price != null ? `$${Number(row.unit_price).toFixed(2)}` : '—'),
			},
			{
				key: 'quantity_on_hand',
				label: 'Stock',
				sortable: true,
				render: (row) => (row.quantity_on_hand != null ? row.quantity_on_hand : '—'),
			},
			{
				key: 'low_stock_threshold',
				label: 'Low at',
				sortable: true,
				render: (row) => (row.low_stock_threshold != null ? row.low_stock_threshold : '—'),
			},
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

	const downloadCsvTemplate = () => {
		const lines =
			kind === 'labs'
				? [
						'test_name,list_price,currency,code,category,notes,sort_order,is_active',
						'CBC,45.00,USD,85025,Hematology,,0,true',
					]
				: kind === 'drugs'
					? [
							'name,unit_price,quantity_on_hand,low_stock_threshold,currency,default_strength,default_route,default_frequency,notes,sort_order,is_active',
							'Amoxicillin 500mg,12.50,100,20,USD,500 mg,oral,three times daily,,0,true',
						]
					: [];
		if (!lines.length) return;
		const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `paypill-catalog-${kind}-template.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const runCsvImport = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		if (kind === 'services') {
			toast.error('Use JSON import for services.');
			return;
		}
		setCsvImporting(true);
		try {
			const text = await file.text();
			const { rows } = parseSimpleCsv(text);
			if (!rows.length) {
				toast.error('No data rows in CSV');
				return;
			}
			let items;
			if (kind === 'labs') {
				items = rows
					.map((r) => {
						const test_name = String(r.test_name || '').trim();
						if (!test_name) return null;
						const list_price = Number.parseFloat(String(r.list_price ?? '0'));
						return {
							test_name,
							list_price: Number.isFinite(list_price) ? Math.max(0, list_price) : 0,
							currency: String(r.currency || 'USD').trim().toUpperCase() || 'USD',
							code: String(r.code || '').trim() || null,
							category: String(r.category || '').trim() || null,
							notes: String(r.notes || '').trim() || null,
							sort_order: r.sort_order === '' ? 0 : Number.parseInt(String(r.sort_order), 10) || 0,
							is_active: !/^false|0$/i.test(String(r.is_active ?? 'true')),
						};
					})
					.filter(Boolean);
			} else {
				items = rows
					.map((r) => {
						const name = String(r.name || '').trim();
						if (!name) return null;
						const unit_price = Number.parseFloat(String(r.unit_price ?? '0'));
						const quantity_on_hand = Number.parseInt(String(r.quantity_on_hand ?? '0'), 10);
						const lowRaw = String(r.low_stock_threshold ?? '').trim();
						return {
							name,
							unit_price: Number.isFinite(unit_price) ? Math.max(0, unit_price) : 0,
							quantity_on_hand: Number.isFinite(quantity_on_hand) ? Math.max(0, quantity_on_hand) : 0,
							low_stock_threshold: lowRaw === '' ? null : Math.max(0, Number.parseInt(lowRaw, 10) || 0),
							currency: String(r.currency || 'USD').trim().toUpperCase() || 'USD',
							default_strength: String(r.default_strength || '').trim() || null,
							default_route: String(r.default_route || '').trim() || null,
							default_frequency: String(r.default_frequency || '').trim() || null,
							default_duration_days: null,
							default_quantity: null,
							default_refills: 0,
							notes: String(r.notes || '').trim() || null,
							sort_order: r.sort_order === '' ? 0 : Number.parseInt(String(r.sort_order), 10) || 0,
							is_active: !/^false|0$/i.test(String(r.is_active ?? 'true')),
						};
					})
					.filter(Boolean);
			}
			if (!items.length) {
				toast.error('No valid rows');
				return;
			}
			const body = { items, replace: replaceAll };
			const res = await apiServerClient.fetch(apiPath, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const out = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(out.error || 'CSV import failed');
			toast.success(`Imported ${out.imported ?? items.length} row(s) from CSV.`);
			await load();
		} catch (e) {
			toast.error(e.message || 'CSV import failed');
		} finally {
			setCsvImporting(false);
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

			{kind !== 'services' ? (
				<Card>
					<CardHeader>
						<CardTitle>Bulk upload (CSV)</CardTitle>
						<CardDescription>
							Same columns as admin bulk templates. Uses the same replace-all option as JSON import above.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap gap-2">
							<Button type="button" variant="outline" size="sm" onClick={downloadCsvTemplate}>
								<Download className="h-4 w-4 mr-1.5" />
								Download CSV template
							</Button>
							<input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void runCsvImport(e)} />
							<Button
								type="button"
								variant="secondary"
								size="sm"
								disabled={csvImporting}
								onClick={() => csvInputRef.current?.click()}
							>
								<Upload className="h-4 w-4 mr-1.5" />
								{csvImporting ? 'Importing…' : 'Choose CSV file'}
							</Button>
						</div>
					</CardContent>
				</Card>
			) : null}

			<Dialog open={stockDialog.open} onOpenChange={(o) => !o && setStockDialog((s) => ({ ...s, open: false, row: null }))}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Update stock</DialogTitle>
						<DialogDescription>
							{stockDialog.row?.name ? String(stockDialog.row.name) : 'Medication'} · current on hand:{' '}
							{stockDialog.row?.quantity_on_hand ?? '—'}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<div className="space-y-2">
							<Label>Movement type</Label>
							<Select
								value={stockDialog.mode}
								onValueChange={(v) => setStockDialog((s) => ({ ...s, mode: v === 'adjustment' ? 'adjustment' : 'restock' }))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="restock">Restock (add quantity)</SelectItem>
									<SelectItem value="adjustment">Adjustment (positive or negative)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>{stockDialog.mode === 'restock' ? 'Units to add' : 'Change in units (+ or −)'}</Label>
							<Input
								inputMode="numeric"
								value={stockDialog.delta}
								onChange={(e) => setStockDialog((s) => ({ ...s, delta: e.target.value }))}
							/>
						</div>
						<div className="space-y-1">
							<Label>Note (optional)</Label>
							<Input value={stockDialog.notes} onChange={(e) => setStockDialog((s) => ({ ...s, notes: e.target.value }))} />
						</div>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setStockDialog((s) => ({ ...s, open: false, row: null }))}>
							Cancel
						</Button>
						<Button type="button" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => void submitStockMove()}>
							Apply
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

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
							<div className="grid grid-cols-2 gap-2 border-t pt-3 mt-2">
								<div className="space-y-1">
									<Label>Unit price (patient)</Label>
									<Input
										inputMode="decimal"
										value={drugForm.unit_price}
										onChange={(e) => setDrugForm((f) => ({ ...f, unit_price: e.target.value }))}
									/>
								</div>
								<div className="space-y-1">
									<Label>Currency</Label>
									<Input value={drugForm.currency} onChange={(e) => setDrugForm((f) => ({ ...f, currency: e.target.value }))} />
								</div>
								<div className="space-y-1">
									<Label>Qty on hand</Label>
									<Input
										inputMode="numeric"
										value={drugForm.quantity_on_hand}
										onChange={(e) => setDrugForm((f) => ({ ...f, quantity_on_hand: e.target.value }))}
									/>
								</div>
								<div className="space-y-1">
									<Label>Low-stock alert at (optional)</Label>
									<Input
										inputMode="numeric"
										value={drugForm.low_stock_threshold}
										onChange={(e) => setDrugForm((f) => ({ ...f, low_stock_threshold: e.target.value }))}
										placeholder="e.g. 20"
									/>
								</div>
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
							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1">
									<Label>List price</Label>
									<Input
										inputMode="decimal"
										value={labForm.list_price}
										onChange={(e) => setLabForm((f) => ({ ...f, list_price: e.target.value }))}
									/>
								</div>
								<div className="space-y-1">
									<Label>Currency</Label>
									<Input value={labForm.currency} onChange={(e) => setLabForm((f) => ({ ...f, currency: e.target.value }))} />
								</div>
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

			<Dialog open={formsAttachOpen} onOpenChange={setFormsAttachOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Assign forms to service</DialogTitle>
						<DialogDescription>
							{formsAttachRow
								? `“${formsAttachRow.name}” — only published forms are shown to patients when they pick this line in booking.`
								: null}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<div className="space-y-2">
							<Label>Consent form</Label>
							<Select value={attachConsentId} onValueChange={setAttachConsentId}>
								<SelectTrigger>
									<SelectValue placeholder="None" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">None</SelectItem>
									{providerPortalForms
										.filter((f) => f.form_type === 'consent')
										.map((f) => (
											<SelectItem key={f.id} value={f.id}>
												{f.name}
												{f.status === 'published' ? '' : ' (draft)'}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Intake form (questionnaire)</Label>
							<Select value={attachIntakeId} onValueChange={setAttachIntakeId}>
								<SelectTrigger>
									<SelectValue placeholder="None" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__none__">None</SelectItem>
									{providerPortalForms
										.filter((f) => f.form_type === 'service_intake')
										.map((f) => (
											<SelectItem key={f.id} value={f.id}>
												{f.name}
												{f.status === 'published' ? '' : ' (draft)'}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
						<p className="text-xs text-muted-foreground">
							Create and publish forms under{' '}
							<Link to="/provider/forms" className="text-primary underline-offset-4 hover:underline">
								Provider → Forms
							</Link>
							, then attach them here.
						</p>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setFormsAttachOpen(false)}>
							Cancel
						</Button>
						<Button type="button" disabled={savingAttachments} onClick={() => void saveFormsAttach()}>
							{savingAttachments ? 'Saving…' : 'Save'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
