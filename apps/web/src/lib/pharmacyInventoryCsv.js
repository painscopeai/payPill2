/**
 * Pharmacy inventory CSV import — maps parsed rows to provider_drug_catalog items.
 */

export const INVENTORY_CSV_TEMPLATE_HEADER =
	'name,unit_price,quantity_on_hand,low_stock_threshold,currency,default_strength,default_route,notes,sort_order,is_active';

export const INVENTORY_CSV_TEMPLATE_SAMPLE =
	'Panadol,20.00,100,20,USD,200mg,oral,OTC pain relief,0,true';

/** Normalize header keys from parseSimpleCsv and accept common aliases. */
function cell(row, ...keys) {
	for (const k of keys) {
		if (row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim();
	}
	return '';
}

function parseBool(raw) {
	return !/^false|0|no$/i.test(String(raw ?? 'true').trim());
}

/**
 * @param {Record<string, string>[]} rows from parseSimpleCsv
 * @returns {{ items: object[], skipped: number, errors: string[] }}
 */
export function mapCsvRowsToInventoryItems(rows) {
	const items = [];
	const errors = [];
	let skipped = 0;

	rows.forEach((r, idx) => {
		const rowNum = idx + 2;
		const name = cell(r, 'name', 'product', 'medication', 'product_name', 'item');
		if (!name) {
			skipped++;
			return;
		}

		const unit_price = Number.parseFloat(cell(r, 'unit_price', 'price', 'unitprice'));
		const quantity_on_hand = Number.parseInt(cell(r, 'quantity_on_hand', 'stock', 'on_hand', 'qty', 'quantity'), 10);
		const lowRaw = cell(r, 'low_stock_threshold', 'low_at', 'low_stock', 'reorder_level');
		const lowParsed = lowRaw === '' ? null : Number.parseInt(lowRaw, 10);

		if (cell(r, 'unit_price', 'price') !== '' && !Number.isFinite(unit_price)) {
			errors.push(`Row ${rowNum}: invalid unit_price`);
			return;
		}
		if (cell(r, 'quantity_on_hand', 'stock', 'on_hand', 'qty', 'quantity') !== '' && !Number.isFinite(quantity_on_hand)) {
			errors.push(`Row ${rowNum}: invalid quantity_on_hand`);
			return;
		}
		if (lowRaw !== '' && (!Number.isFinite(lowParsed) || lowParsed < 0)) {
			errors.push(`Row ${rowNum}: invalid low_stock_threshold`);
			return;
		}

		const sortRaw = cell(r, 'sort_order');
		const sort_order = sortRaw === '' ? 0 : Number.parseInt(sortRaw, 10);
		if (sortRaw !== '' && !Number.isFinite(sort_order)) {
			errors.push(`Row ${rowNum}: invalid sort_order`);
			return;
		}

		items.push({
			name,
			unit_price: Number.isFinite(unit_price) ? Math.max(0, unit_price) : 0,
			quantity_on_hand: Number.isFinite(quantity_on_hand) ? Math.max(0, quantity_on_hand) : 0,
			low_stock_threshold: lowParsed != null ? Math.max(0, lowParsed) : null,
			currency: (cell(r, 'currency') || 'USD').toUpperCase().slice(0, 8) || 'USD',
			default_strength: cell(r, 'default_strength', 'strength') || null,
			default_route: cell(r, 'default_route', 'route') || 'oral',
			default_frequency: cell(r, 'default_frequency', 'frequency') || null,
			default_duration_days: null,
			default_quantity: null,
			default_refills: 0,
			notes: cell(r, 'notes', 'note') || null,
			sort_order: Number.isFinite(sort_order) ? sort_order : 0,
			is_active: parseBool(cell(r, 'is_active', 'active')),
		});
	});

	return { items, skipped, errors };
}

export function downloadInventoryCsvTemplate() {
	const lines = [INVENTORY_CSV_TEMPLATE_HEADER, INVENTORY_CSV_TEMPLATE_SAMPLE];
	const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'paypill-pharmacy-inventory-template.csv';
	a.click();
	URL.revokeObjectURL(url);
}
