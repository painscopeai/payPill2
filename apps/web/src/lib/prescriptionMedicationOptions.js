/** Standard dosing frequency options for formulary and encounter prescribing. */
export const MEDICATION_FREQUENCY_OPTIONS = [
	{ value: 'once_daily', label: 'Once daily (QD)' },
	{ value: 'twice_daily', label: 'Twice daily (BID)' },
	{ value: 'three_times_daily', label: 'Three times daily (TID)' },
	{ value: 'four_times_daily', label: 'Four times daily (QID)' },
	{ value: 'every_morning', label: 'Every morning (QAM)' },
	{ value: 'every_evening', label: 'Every evening (QHS)' },
	{ value: 'at_bedtime', label: 'At bedtime (HS)' },
	{ value: 'every_4_hours', label: 'Every 4 hours (Q4H)' },
	{ value: 'every_6_hours', label: 'Every 6 hours (Q6H)' },
	{ value: 'every_8_hours', label: 'Every 8 hours (Q8H)' },
	{ value: 'every_12_hours', label: 'Every 12 hours (Q12H)' },
	{ value: 'once_weekly', label: 'Once weekly' },
	{ value: 'every_other_day', label: 'Every other day' },
	{ value: 'with_meals', label: 'With meals' },
	{ value: 'before_meals', label: 'Before meals' },
	{ value: 'after_meals', label: 'After meals' },
	{ value: 'as_needed', label: 'As needed (PRN)' },
];

export const MEDICATION_FREQUENCY_LABEL_BY_VALUE = Object.fromEntries(
	MEDICATION_FREQUENCY_OPTIONS.map((o) => [o.value, o.label]),
);

export const MEDICATION_ROUTE_OPTIONS = [
	{ value: 'oral', label: 'Oral' },
	{ value: 'sublingual', label: 'Sublingual' },
	{ value: 'topical', label: 'Topical' },
	{ value: 'transdermal', label: 'Transdermal' },
	{ value: 'inhaled', label: 'Inhaled' },
	{ value: 'intranasal', label: 'Intranasal' },
	{ value: 'ophthalmic', label: 'Ophthalmic' },
	{ value: 'otic', label: 'Otic' },
	{ value: 'rectal', label: 'Rectal' },
	{ value: 'subcutaneous', label: 'Subcutaneous' },
	{ value: 'intramuscular', label: 'Intramuscular' },
	{ value: 'intravenous', label: 'Intravenous' },
];

export function frequencyLabel(value) {
	if (!value) return '';
	const key = String(value).trim();
	return MEDICATION_FREQUENCY_LABEL_BY_VALUE[key] || key.replace(/_/g, ' ');
}

export function frequencySelectValue(stored) {
	if (!stored) return '';
	const s = String(stored).trim();
	if (MEDICATION_FREQUENCY_LABEL_BY_VALUE[s]) return s;
	const match = MEDICATION_FREQUENCY_OPTIONS.find(
		(o) => o.label.toLowerCase() === s.toLowerCase() || o.label.toLowerCase().startsWith(s.toLowerCase()),
	);
	return match?.value || (s.includes('_') ? s : '__custom__');
}

export function buildPrescriptionSig({ frequency, strength, route, dose }) {
	return [frequencyLabel(frequency) || frequency, dose, strength, route].filter(Boolean).join(' · ');
}

/** Map catalog drug row to a template / encounter line shape. */
export function drugCatalogToRxLine(drug, idPrefix = 'rx') {
	const freq = drug.default_frequency || '';
	const sig = buildPrescriptionSig({
		frequency: freq,
		strength: drug.default_strength,
		route: drug.default_route,
		dose: '',
	});
	return {
		id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${idPrefix}-${Date.now()}`,
		medication_name: drug.name || '',
		strength: drug.default_strength || '',
		dose: '',
		route: drug.default_route || 'oral',
		frequency: freq,
		duration_days: drug.default_duration_days != null ? String(drug.default_duration_days) : '',
		quantity: drug.default_quantity != null ? String(drug.default_quantity) : '',
		refills: drug.default_refills != null ? String(drug.default_refills) : '0',
		sig,
		catalog_id: drug.id || null,
	};
}
