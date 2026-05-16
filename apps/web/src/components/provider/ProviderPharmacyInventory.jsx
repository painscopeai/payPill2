import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ProviderDataTable } from '@/components/provider/ProviderDataTable.jsx';
import { TableRowActionsMenu } from '@/components/TableRowActionsMenu.jsx';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AlertTriangle, Package, Pencil, Plus, Trash2 } from 'lucide-react';

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

	const [stockDialog, setStockDialog] = useState({
		open: false,
		row: null,
		mode: 'restock',
		delta: '',
		notes: '',
	});

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
				quantity_on_hand: drugForm.quantity_on_hand ? Number(drugForm.quantity_on_hand) : 0,
				low_stock_threshold:
					drugForm.low_stock_threshold === '' || drugForm.low_stock_threshold == null
						? null
						: Math.max(0, Math.floor(Number(drugForm.low_stock_threshold))),
				notes: drugForm.notes.trim() || null,
			};
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
			toast.success('Stock updated');
			setStockDialog((s) => ({ ...s, open: false, row: null }));
			await refreshAll();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Update failed');
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
							{ label: 'Restock', icon: Package, onClick: () => openStockDialog(row, 'restock') },
							{
								label: 'Adjust stock',
								icon: Package,
								onClick: () => openStockDialog(row, 'adjustment'),
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
		{ key: 'reason', label: 'Type', render: (r) => <span className="capitalize">{r.reason || '—'}</span> },
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
					<Button type="button" variant="outline" asChild>
						<Link to="/provider/settings/catalog/drugs">Full drug formulary</Link>
					</Button>
					<Button type="button" onClick={openCreate}>
						<Plus className="h-4 w-4 mr-1.5" />
						Add product
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Stock on hand</CardTitle>
					<CardDescription>Restock, adjust quantities, or edit product details.</CardDescription>
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

			<Dialog open={stockDialog.open} onOpenChange={(o) => !o && setStockDialog((s) => ({ ...s, open: false, row: null }))}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Update stock</DialogTitle>
						<DialogDescription>
							{stockDialog.row?.name ? String(stockDialog.row.name) : 'Product'} · current on hand:{' '}
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
									<SelectItem value="adjustment">Adjustment (+ or −)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>{stockDialog.mode === 'restock' ? 'Units to add' : 'Change in units'}</Label>
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
						<DialogTitle>{editingId ? 'Edit product' : 'Add product'}</DialogTitle>
						<DialogDescription>Inventory fields sync to the patient pharmacy shop when stock is available.</DialogDescription>
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
									onChange={(e) => setDrugForm((f) => ({ ...f, quantity_on_hand: e.target.value }))}
								/>
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
