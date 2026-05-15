export const BULK_TEMPLATE_KINDS = [
	'employees',
	'insurance_users',
	'providers',
	'provider_types',
	'visit_types',
	'insurance_options',
	'provider_services',
	'provider_lab_catalog',
	'provider_pharmacy_catalog',
	'employer_contracts',
] as const;

export type BulkTemplateKind = (typeof BULK_TEMPLATE_KINDS)[number];

export function isBulkTemplateKind(s: string): s is BulkTemplateKind {
	return (BULK_TEMPLATE_KINDS as readonly string[]).includes(s);
}

/** Ordered header row for each template (source of truth for validation + downloads). */
export const BULK_HEADERS: Record<BulkTemplateKind, readonly string[]> = {
	employees: ['email', 'password', 'first_name', 'last_name', 'department'],
	insurance_users: ['email', 'password', 'company_name', 'phone', 'status'],
	providers: [
		'name',
		'email',
		'phone',
		'category',
		'specialty',
		'address',
		'status',
		'telemedicine_available',
	],
	provider_types: ['slug', 'label', 'sort_order', 'active'],
	visit_types: ['slug', 'label', 'sort_order', 'active'],
	insurance_options: ['slug', 'label', 'sort_order', 'active', 'copay_estimate'],
	provider_services: ['name', 'category', 'unit', 'price', 'currency', 'notes', 'is_active', 'sort_order'],
	provider_lab_catalog: ['test_name', 'list_price', 'currency', 'code', 'category', 'notes', 'sort_order', 'is_active'],
	provider_pharmacy_catalog: [
		'name',
		'unit_price',
		'quantity_on_hand',
		'low_stock_threshold',
		'currency',
		'default_strength',
		'default_route',
		'default_frequency',
		'notes',
		'sort_order',
		'is_active',
	],
	employer_contracts: ['name', 'effective_date', 'status', 'notes'],
};

/** Extra columns accepted on upload (ignored if absent); keeps older sheets working. */
export const BULK_OPTIONAL_HEADERS: Partial<Record<BulkTemplateKind, readonly string[]>> = {
	employees: ['hire_date'],
};

export const BULK_TEMPLATE_FILENAMES: Record<BulkTemplateKind, string> = {
	employees: 'paypill-bulk-employees-template.csv',
	insurance_users: 'paypill-bulk-insurance-users-template.csv',
	providers: 'paypill-bulk-providers-template.csv',
	provider_types: 'paypill-bulk-provider-types-template.csv',
	visit_types: 'paypill-bulk-visit-types-template.csv',
	insurance_options: 'paypill-bulk-insurance-options-template.csv',
	provider_services: 'paypill-bulk-provider-services-template.csv',
	provider_lab_catalog: 'paypill-bulk-provider-lab-catalog-template.csv',
	provider_pharmacy_catalog: 'paypill-bulk-provider-pharmacy-catalog-template.csv',
	employer_contracts: 'paypill-bulk-employer-contracts-template.csv',
};

export function buildTemplateCsv(kind: BulkTemplateKind): string {
	const headers = [...BULK_HEADERS[kind]];
	const sampleRows: Record<BulkTemplateKind, string[][]> = {
		employees: [
			['alex.smith@company.com', 'TemporaryPass1!', 'Alex', 'Smith', 'Engineering'],
			['jamie.lee@company.com', 'TemporaryPass2!', 'Jamie', 'Lee', 'HR'],
		],
		insurance_users: [
			['ops@lifeguardinsurance.com', 'TemporaryPass1!', 'LifeGuard Insurance', '+1-555-0101', 'active'],
		],
		providers: [
			[
				'Example Clinic',
				'care@example-clinic.com',
				'555-0100',
				'clinic',
				'Primary Care',
				'123 Main St',
				'pending',
				'false',
			],
		],
		provider_types: [['primary-care', 'Primary Care', '10', 'true']],
		visit_types: [['follow-up', 'Follow-up visit', '20', 'true']],
		insurance_options: [['cigna', 'Cigna', '15', 'true', '30.00']],
		provider_services: [
			['Office visit', 'service', 'per_visit', '150.00', 'USD', '', 'true', '0'],
		],
		provider_lab_catalog: [['CBC', '45.00', 'USD', '85025', 'Hematology', '', '0', 'true']],
		provider_pharmacy_catalog: [
			['Amoxicillin 500mg', '12.50', '100', '20', 'USD', '500 mg', 'oral', 'three times daily', '', '0', 'true'],
		],
		employer_contracts: [
			['2025 Health Plan', '2025-01-01', 'active', 'Renewal notes optional'],
		],
	};
	const lines = [headers.join(',')];
	for (const row of sampleRows[kind]) {
		lines.push(row.map(escapeCsvCell).join(','));
	}
	return lines.join('\n') + '\n';
}

function escapeCsvCell(val: string): string {
	if (val.includes(',') || val.includes('"') || val.includes('\n')) {
		return `"${val.replace(/"/g, '""')}"`;
	}
	return val;
}
