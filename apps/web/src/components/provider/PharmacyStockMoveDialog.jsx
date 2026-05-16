import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import {
	ADJUSTMENT_DIRECTION_OPTIONS,
	STOCK_MOVE_MODE_OPTIONS,
	STOCK_MOVE_REASON,
	computeStockDelta,
	stockMoveDialogTitle,
	stockMoveUnitsLabel,
} from '@/lib/pharmacyStockMovement';

const emptyState = () => ({
	open: false,
	row: null,
	mode: STOCK_MOVE_REASON.ADDITION,
	adjustmentDirection: 'add',
	units: '10',
	notes: '',
});

/**
 * Shared pharmacy stock movement dialog (addition, reduction, adjustment).
 */
export function usePharmacyStockMoveDialog() {
	const [state, setState] = useState(emptyState);

	const open = (row, mode = STOCK_MOVE_REASON.ADDITION) => {
		const m =
			mode === STOCK_MOVE_REASON.REDUCTION
				? STOCK_MOVE_REASON.REDUCTION
				: mode === STOCK_MOVE_REASON.ADJUSTMENT
					? STOCK_MOVE_REASON.ADJUSTMENT
					: STOCK_MOVE_REASON.ADDITION;
		setState({
			open: true,
			row,
			mode: m,
			adjustmentDirection: 'add',
			units: m === STOCK_MOVE_REASON.REDUCTION ? '1' : '10',
			notes: '',
		});
	};

	const close = () => setState(emptyState());

	return { state, setState, open, close };
}

export function PharmacyStockMoveDialog({ state, setState, onApplied }) {
	const close = () => setState((s) => ({ ...s, open: false, row: null }));

	const submit = async () => {
		const row = state.row;
		if (!row?.id) return;
		const units = Number(state.units);
		if (!Number.isFinite(units) || units <= 0) {
			toast.error('Enter a positive number of units');
			return;
		}
		const delta_qty = computeStockDelta(state.mode, units, state.adjustmentDirection);
		if (delta_qty === 0) {
			toast.error('Invalid quantity');
			return;
		}
		try {
			const res = await apiServerClient.fetch('/provider/inventory/pharmacy/move', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drug_catalog_id: row.id,
					delta_qty,
					reason: state.mode === STOCK_MOVE_REASON.RESTOCK ? STOCK_MOVE_REASON.ADDITION : state.mode,
					adjustment_direction:
						state.mode === STOCK_MOVE_REASON.ADJUSTMENT ? state.adjustmentDirection : undefined,
					notes: state.notes.trim() || null,
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Update failed');
			toast.success('Stock updated');
			close();
			onApplied?.();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Update failed');
		}
	};

	const isAdjustment = state.mode === STOCK_MOVE_REASON.ADJUSTMENT;

	return (
		<Dialog open={state.open} onOpenChange={(o) => !o && close()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{stockMoveDialogTitle(state.mode)}</DialogTitle>
					<DialogDescription>
						{state.row?.name ? String(state.row.name) : 'Product'} · current on hand:{' '}
						<span className="font-medium tabular-nums">{state.row?.quantity_on_hand ?? '—'}</span>
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 py-2">
					<div className="space-y-2">
						<Label>Movement type</Label>
						<Select
							value={state.mode}
							onValueChange={(v) =>
								setState((s) => ({
									...s,
									mode: v,
									units:
										v === STOCK_MOVE_REASON.REDUCTION
											? s.units && Number(s.units) > 0
												? s.units
												: '1'
											: s.units,
								}))
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STOCK_MOVE_MODE_OPTIONS.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{isAdjustment ? (
						<div className="space-y-2">
							<Label>Adjustment direction</Label>
							<Select
								value={state.adjustmentDirection}
								onValueChange={(v) =>
									setState((s) => ({
										...s,
										adjustmentDirection: v === 'reduce' ? 'reduce' : 'add',
									}))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ADJUSTMENT_DIRECTION_OPTIONS.map((o) => (
										<SelectItem key={o.value} value={o.value}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					) : null}
					<div className="space-y-1">
						<Label>{stockMoveUnitsLabel(state.mode)}</Label>
						<Input
							inputMode="numeric"
							min={1}
							value={state.units}
							onChange={(e) => setState((s) => ({ ...s, units: e.target.value }))}
						/>
					</div>
					<div className="space-y-1">
						<Label>Note (optional)</Label>
						<Input value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
					</div>
				</div>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={close}>
						Cancel
					</Button>
					<Button type="button" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => void submit()}>
						Apply
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
