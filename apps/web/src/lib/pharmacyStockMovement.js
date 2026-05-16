/** Stock movement reasons stored on provider_pharmacy_stock_movements.reason */
export const STOCK_MOVE_REASON = {
	ADDITION: 'addition',
	REDUCTION: 'reduction',
	ADJUSTMENT: 'adjustment',
	/** @deprecated Legacy alias; treated as addition in API */
	RESTOCK: 'restock',
	SALE: 'sale',
};

export const STOCK_MOVE_MODE_OPTIONS = [
	{ value: STOCK_MOVE_REASON.ADDITION, label: 'Stock addition' },
	{ value: STOCK_MOVE_REASON.REDUCTION, label: 'Stock reduction' },
	{ value: STOCK_MOVE_REASON.ADJUSTMENT, label: 'Stock adjustment' },
];

export const ADJUSTMENT_DIRECTION_OPTIONS = [
	{ value: 'add', label: 'Addition (increase count)' },
	{ value: 'reduce', label: 'Reduction (decrease count)' },
];

/**
 * @param {'addition'|'reduction'|'adjustment'|'restock'} mode
 * @param {string|number} units positive unit count from form
 * @param {'add'|'reduce'} [adjustmentDirection]
 */
export function computeStockDelta(mode, units, adjustmentDirection = 'add') {
	const n = Math.abs(Math.trunc(Number(units)));
	if (!Number.isFinite(n) || n === 0) return 0;
	if (mode === STOCK_MOVE_REASON.ADDITION || mode === STOCK_MOVE_REASON.RESTOCK) return n;
	if (mode === STOCK_MOVE_REASON.REDUCTION) return -n;
	if (mode === STOCK_MOVE_REASON.ADJUSTMENT) {
		return adjustmentDirection === 'reduce' ? -n : n;
	}
	return 0;
}

export function stockMoveDialogTitle(mode) {
	if (mode === STOCK_MOVE_REASON.ADDITION || mode === STOCK_MOVE_REASON.RESTOCK) return 'Stock addition';
	if (mode === STOCK_MOVE_REASON.REDUCTION) return 'Stock reduction';
	if (mode === STOCK_MOVE_REASON.ADJUSTMENT) return 'Stock adjustment';
	return 'Update stock';
}

export function stockMoveUnitsLabel(mode) {
	if (mode === STOCK_MOVE_REASON.ADDITION || mode === STOCK_MOVE_REASON.RESTOCK) return 'Units to add';
	if (mode === STOCK_MOVE_REASON.REDUCTION) return 'Units to remove';
	return 'Units to adjust';
}

export function formatMovementReasonLabel(reason) {
	const r = String(reason || '').toLowerCase();
	if (r === 'addition' || r === 'restock') return 'Stock addition';
	if (r === 'reduction') return 'Stock reduction';
	if (r === 'adjustment') return 'Stock adjustment';
	if (r === 'sale') return 'Patient sale';
	return r || '—';
}
