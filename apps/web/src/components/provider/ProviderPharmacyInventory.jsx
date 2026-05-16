import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { ProviderDataTable } from '@/components/provider/ProviderDataTable.jsx';
import { PharmacyStockMoveDialog, usePharmacyStockMoveDialog } from '@/components/provider/PharmacyStockMoveDialog.jsx';
import { TableRowActionsMenu } from '@/components/TableRowActionsMenu.jsx';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AlertTriangle, Download, Minus, Package, Pencil, Plus, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import { STOCK_MOVE_REASON, formatMovementReasonLabel } from '@/lib/pharmacyStockMovement';
import { parseSimpleCsv } from '@/lib/parseSimpleCsv.js';
import { downloadInventoryCsvTemplate, mapCsvRowsToInventoryItems } from '@/lib/pharmacyInventoryCsv.js';
import { Checkbox } from '@/components/ui/checkbox';

const API_DRUGS = '/provider/catalog/drugs?manage=1';

const emptyDrugForm = () => ({
	name: '',
	default_strength: '',
	default_route: 'oral',
	unit_price: '0',
	currency: 'USD',
	quantity_on_hand: '0',
	low_stock_threshold: '',
	notes: '',
});

function isLowStock(row) {
	const qty = Number(row.quantity_on_hand);
	const threshold = row.low_stock_threshold;
	if (threshold == null || threshold === '') return false;
	return Number.isFinite(qty) && qty <= Number(threshold);
}

export default function ProviderPharmacyInventory() {
	const [items, setItems] = useState([]);
	const [movements, setMovements] = useState([]);
	const [loading, setLoading] = useState(true);
	const [movementsLoading, setMovementsLoading] = useState(true);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [drugForm, setDrugForm] = useState(emptyDrugForm);
	const [savingForm, setSavingForm] = useState(false);

	const stockMove = usePharmacyStockMoveDialog();
	const csvInputRef = useRef(null);
	const [csvImporting, setCsvImporting] = useState(false);
	const [replaceAllCsv, setReplaceAllCsv] = useState(false);

	const loadCatalog = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch(API_DRUGS);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load inventory');
			setItems(Array.isArray(body.items) ? body.items : []);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to load inventory');
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, []);

	const loadMovements = useCallback(async () => {
		setMovementsLoading(true);
		try {
			const res = await apiServerClient.fetch('/provider/inventory/pharmacy/movements?limit=40');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load movements');
			setMovements(Array.isArray(body.items) ? body.items : []);
		} catch {
			setMovements([]);
		} finally {
			setMovementsLoading(false);
		}
	}, []);

	const refreshAll = useCallback(async () => {
		await Promise.all([loadCatalog(), loadMovements()]);
	}, [loadCatalog, loadMovements]);

	useEffect(() => {
		void refreshAll();
	}, [refreshAll]);

	const lowStockCount = useMemo(() => items.filter(isLowStock).length, [items]);

	const openCreate = () => {
		setEditingId(null);
		setDrugForm(emptyDrugForm());
		setDialogOpen(true);
	};

	const openEdit = (row) => {
		setEditingId(row.id);
		setDrugForm({
			name: row.name || '',
			default_strength: row.default_strength || '',
			default_route: row.default_route || 'oral',
			unit_price: row.unit_price != null ? String(row.unit_price) : '0',
			currency: row.currency || 'USD',
			quantity_on_hand: row.quantity_on_hand != null ? String(row.quantity_on_hand) : '0',
			low_stock_threshold:
				row.low_stock_threshold != null && row.low_stock_threshold !== ''
					? String(row.low_stock_threshold)
					: '',
			notes: row.notes || '',
		});
		setDialogOpen(true);
	};

	const saveForm = async () => {
		setSavingForm(true);
		try {
			const up = Number(drugForm.unit_price);
			const payload = {
				name: drugForm.name.trim(),
				default_strength: drugForm.default_strength.trim() || null,
				default_route: drugForm.default_route.trim() || null,
				unit_price: Number.isFinite(up) ? Math.max(0, up) : 0,
				currency: (drugForm.currency || 'USD').trim().toUpperCase() || 'USD',
				low_stock_threshold:
					drugForm.low_stock_threshold === '' || drugForm.low_stock_threshold == null
						? null
						: Math.max(0, Math.floor(Number(drugForm.low_stock_threshold))),
				notes: drugForm.notes.trim() || null,
			};
			if (!editingId) {
				payload.quantity_on_hand = drugForm.quantity_on_hand ? Number(drugForm.quantity_on_hand) : 0;
			}
			if (!payload.name) {
				toast.error('Medication name is required');
				return;
			}
			if (editingId) {
				const res = await apiServerClient.fetch(`/provider/catalog/drugs/${encodeURIComponent(editingId)}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Save failed');
				toast.success('Product updated');
			} else {
				const res = await apiServerClient.fetch('/provider/catalog/drugs', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ item: payload }),
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Save failed');
				toast.success('Product added');
			}
			setDialogOpen(false);
			await refreshAll();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Save failed');
		} finally {
			setSavingForm(false);
		}
	};

	const runCsvImport = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
			toast.error('Please choose a .csv file');
			return;
		}
		setCsvImporting(true);
		try {
			const text = await file.text();
			const { rows } = parseSimpleCsv(text);
			if (!rows.length) {
				toast.error('No data rows found in CSV');
				return;
			}
			const { items: parsedItems, skipped, errors } = mapCsvRowsToInventoryItems(rows);
			if (errors.length) {
				toast.error(errors.slice(0, 3).join(' · ') + (errors.length > 3 ? ` (+${errors.length - 3} more)` : ''));
				return;
			}
			if (!parsedItems.length) {
				toast.error('No valid rows — each row needs a product name');
				return;
			}
			if (replaceAllCsv) {
				const ok = window.confirm(
					`Replace all ${items.length} existing inventory item(s) with ${parsedItems.length} row(s) from the CSV? This cannot be undone.`,
				);
				if (!ok) return;
			}
			const res = await apiServerClient.fetch('/provider/catalog/drugs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items: parsedItems, replace: replaceAllCsv }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'CSV import failed');
			const imported = body.imported ?? parsedItems.length;
			const skippedMsg = skipped > 0 ? ` (${skipped} empty row(s) skipped)` : '';
			toast.success(`Imported ${imported} item(s) from CSV${skippedMsg}`);
			await refreshAll();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'CSV import failed');
		} finally {
			setCsvImporting(false);
		}
	};

	const deleteRow = async (id) => {
		if (!window.confirm('Delete this product from inventory?')) return;
		try {
			const res = await apiServerClient.fetch(`/provider/catalog/drugs/${encodeURIComponent(id)}`, {
				method: 'DELETE',
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Delete failed');
			toast.success('Deleted');
			await refreshAll();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Delete failed');
		}
	};

	const columns = [
		{
			key: 'name',
			label: 'Product',
			sortable: true,
			render: (row) => (
				<div className="flex flex-col gap-1">
					<span className="font-medium">{row.name}</span>
					{isLowStock(row) ? (
						<Badge variant="outline" className="w-fit border-amber-500 text-amber-700 dark:text-amber-300">
							<AlertTriangle className="h-3 w-3 mr-1 inline" />
							Low stock
						</Badge>
					) : null}
				</div>
			),
		},
		{
			key: 'quantity_on_hand',
			label: 'On hand',
			sortable: true,
			render: (row) => <span className="tabular-nums font-medium">{row.quantity_on_hand ?? 0}</span>,
		},
		{
			key: 'low_stock_threshold',
			label: 'Low at',
			sortable: true,
			render: (row) => (row.low_stock_threshold != null ? row.low_stock_threshold : '—'),
		},
		{
			key: 'unit_price',
			label: 'Unit price',
			sortable: true,
			render: (row) =>
				row.unit_price != null ? `${row.currency || 'USD'} ${Number(row.unit_price).toFixed(2)}` : '—',
		},
		{
			key: 'default_strength',
			label: 'Strength',
			sortable: true,
			render: (row) => row.default_strength || '—',
		},
		{
			key: 'actions',
			label: '',
			sortable: false,
			className: 'w-[72px]',
			render: (row) => (
				<div className="flex justify-end">
					<TableRowActionsMenu
						items={[
							{
								label: 'Stock addition',
								icon: Plus,
								onClick: () => stockMove.open(row, STOCK_MOVE_REASON.ADDITION),
							},
							{
								label: 'Stock reduction',
								icon: Minus,
								onClick: () => stockMove.open(row, STOCK_MOVE_REASON.REDUCTION),
								separatorBefore: true,
							},
							{
								label: 'Stock adjustment',
								icon: SlidersHorizontal,
								onClick: () => stockMove.open(row, STOCK_MOVE_REASON.ADJUSTMENT),
								separatorBefore: true,
							},
							{
								label: 'Edit',
								icon: Pencil,
								onClick: () => openEdit(row),
								separatorBefore: true,
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
		},
	];

	const movementColumns = [
		{
			key: 'created_at',
			label: 'When',
			render: (r) => {
				try {
					return format(new Date(r.created_at), 'MMM d, yyyy HH:mm');
				} catch {
					return '—';
				}
			},
		},
		{ key: 'drug_name', label: 'Product', render: (r) => r.drug_name },
		{
			key: 'delta_qty',
			label: 'Change',
			render: (r) => (
				<span className={Number(r.delta_qty) < 0 ? 'text-destructive' : 'text-emerald-600'}>
					{Number(r.delta_qty) > 0 ? `+${r.delta_qty}` : r.delta_qty}
				</span>
			),
		},
		{
			key: 'reason',
			label: 'Type',
			render: (r) => <span>{formatMovementReasonLabel(r.reason)}</span>,
		},
		{ key: 'notes', label: 'Note', render: (r) => r.notes || '—' },
	];

	return (
		<div className="space-y-8 w-full max-w-6xl">
			<Helmet>
				<title>Pharmacy inventory — Provider</title>
			</Helmet>

			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
						<Package className="h-8 w-8 text-teal-600" />
						Pharmacy inventory
					</h1>
					<p className="text-muted-foreground mt-1 max-w-2xl">
						Manage on-hand stock, pricing, and restock movements. Patients can order in-stock items from your
						practice shop when inventory is available.
					</p>
					{lowStockCount > 0 ? (
						<p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
							{lowStockCount} product{lowStockCount === 1 ? '' : 's'} at or below low-stock threshold.
						</p>
					) : null}
				</div>
				<div className="flex flex-wrap gap-2 shrink-0">
					<Button type="button" variant="outline" disabled={csvImporting} onClick={() => csvInputRef.current?.click()}>
						<Upload className="h-4 w-4 mr-1.5" />
						{csvImporting ? 'Importing…' : 'Import CSV'}
					</Button>
					<input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void runCsvImport(e)} />
					<Button type="button" onClick={openCreate}>
						<Plus className="h-4 w-4 mr-1.5" />
						Add item
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Bulk import (CSV)</CardTitle>
					<CardDescription>
						Download the template, fill in your products, then use Import CSV. Each row needs a name; optional columns
						include unit price, on hand, low-stock threshold, currency, strength, route, and notes.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<Button type="button" variant="outline" size="sm" onClick={downloadInventoryCsvTemplate}>
						<Download className="h-4 w-4 mr-1.5" />
						Download CSV template
					</Button>
					<label className="flex items-start gap-2 text-sm cursor-pointer">
						<Checkbox checked={replaceAllCsv} onCheckedChange={(v) => setReplaceAllCsv(v === true)} className="mt-0.5" />
						<span>
							<span className="font-medium">Replace entire inventory</span>
							<span className="text-muted-foreground block text-xs mt-0.5">
								Removes all current items before importing (use with care).
							</span>
						</span>
					</label>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Stock on hand</CardTitle>
					<CardDescription>
						Use stock addition, reduction, or adjustment to change quantities. Edit updates product details only.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ProviderDataTable
						columns={columns}
						data={items}
						isLoading={loading}
						emptyMessage="No products yet. Add your first medication to start tracking inventory."
						getRowId={(r) => r.id}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Recent stock movements</CardTitle>
					<CardDescription>Audit trail of restocks, adjustments, and patient sales.</CardDescription>
				</CardHeader>
				<CardContent>
					<ProviderDataTable
						columns={movementColumns}
						data={movements}
						isLoading={movementsLoading}
						emptyMessage="No movements recorded yet."
						getRowId={(r) => r.id}
					/>
				</CardContent>
			</Card>

			<PharmacyStockMoveDialog
				state={stockMove.state}
				setState={stockMove.setState}
				onApplied={() => void refreshAll()}
			/>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{editingId ? 'Edit item' : 'Add item'}</DialogTitle>
						<DialogDescription>
							{editingId
								? 'Update product details. Change on-hand quantity using Stock addition, reduction, or adjustment from the row menu.'
								: 'Add stock to your pharmacy inventory. Pricing and on-hand quantity sync to the patient shop when in stock.'}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div className="space-y-1">
							<Label>Name *</Label>
							<Input value={drugForm.name} onChange={(e) => setDrugForm((f) => ({ ...f, name: e.target.value }))} />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label>Unit price</Label>
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
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label>On hand</Label>
								<Input
									inputMode="numeric"
									value={drugForm.quantity_on_hand}
									disabled={Boolean(editingId)}
									readOnly={Boolean(editingId)}
									className={editingId ? 'bg-muted cursor-not-allowed opacity-80' : ''}
									onChange={(e) => setDrugForm((f) => ({ ...f, quantity_on_hand: e.target.value }))}
								/>
								{editingId ? (
									<p className="text-xs text-muted-foreground">
										Use Stock addition, reduction, or adjustment on the table row to change quantity.
									</p>
								) : null}
							</div>
							<div className="space-y-1">
								<Label>Low-stock alert at</Label>
								<Input
									inputMode="numeric"
									placeholder="Optional"
									value={drugForm.low_stock_threshold}
									onChange={(e) => setDrugForm((f) => ({ ...f, low_stock_threshold: e.target.value }))}
								/>
							</div>
						</div>
						<div className="space-y-1">
							<Label>Strength</Label>
							<Input
								value={drugForm.default_strength}
								onChange={(e) => setDrugForm((f) => ({ ...f, default_strength: e.target.value }))}
							/>
						</div>
						<div className="space-y-1">
							<Label>Notes</Label>
							<Input value={drugForm.notes} onChange={(e) => setDrugForm((f) => ({ ...f, notes: e.target.value }))} />
						</div>
					</div>
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
