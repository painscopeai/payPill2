import { getSupabaseAdmin } from '@/server/supabase/admin';

function sb() {
	return getSupabaseAdmin();
}

const SLUG_RE = /^[a-z0-9_-]+$/;

export type VisitTypeRow = {
	id: string;
	slug: string;
	label: string;
	sort_order: number;
	active: boolean;
	created_at: string;
	updated_at: string;
};

export type InsuranceOptionRow = {
	id: string;
	slug: string;
	label: string;
	sort_order: number;
	active: boolean;
	copay_estimate: number | null;
	created_at: string;
	updated_at: string;
};

export function normalizeSlug(raw: string): string {
	return raw.trim().toLowerCase();
}

export function assertValidSlug(slug: string): void {
	if (!slug || !SLUG_RE.test(slug)) {
		throw Object.assign(new Error('slug must be lowercase letters, digits, hyphen or underscore'), {
			status: 400,
		});
	}
}

// --- Visit types ---

export async function listVisitTypes(includeInactive: boolean): Promise<VisitTypeRow[]> {
	let q = sb().from('visit_types').select('*');
	if (includeInactive) {
		q = q.order('active', { ascending: false });
	}
	q = q.order('sort_order', { ascending: true }).order('label', { ascending: true });
	if (!includeInactive) {
		q = q.eq('active', true);
	}
	const { data, error } = await q;
	if (error) throw error;
	return (data || []) as VisitTypeRow[];
}

export async function getVisitType(id: string): Promise<VisitTypeRow | null> {
	const { data, error } = await sb().from('visit_types').select('*').eq('id', id).maybeSingle();
	if (error) throw error;
	return (data as VisitTypeRow) || null;
}

export async function createVisitType(input: {
	slug: string;
	label: string;
	sort_order?: number;
	active?: boolean;
}): Promise<VisitTypeRow> {
	const slug = normalizeSlug(input.slug);
	assertValidSlug(slug);
	const label = input.label.trim();
	if (!label) {
		throw Object.assign(new Error('label is required'), { status: 400 });
	}
	const row = {
		slug,
		label,
		sort_order: input.sort_order ?? 0,
		active: input.active !== false,
		updated_at: new Date().toISOString(),
	};
	const { data, error } = await sb().from('visit_types').insert(row).select('*').single();
	if (error) {
		if (error.code === '23505') {
			throw Object.assign(new Error('slug already exists'), { status: 409 });
		}
		throw error;
	}
	return data as VisitTypeRow;
}

export async function updateVisitType(
	id: string,
	patch: Partial<{ label: string; sort_order: number; active: boolean }>,
): Promise<VisitTypeRow> {
	const existing = await getVisitType(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (patch.label !== undefined) {
		const l = patch.label.trim();
		if (!l) throw Object.assign(new Error('label cannot be empty'), { status: 400 });
		updates.label = l;
	}
	if (patch.sort_order !== undefined) updates.sort_order = patch.sort_order;
	if (patch.active !== undefined) updates.active = patch.active;
	const { data, error } = await sb().from('visit_types').update(updates).eq('id', id).select('*').single();
	if (error) throw error;
	return data as VisitTypeRow;
}

export async function deactivateVisitType(id: string): Promise<VisitTypeRow> {
	return updateVisitType(id, { active: false });
}

// --- Insurance options ---

export async function listInsuranceOptions(includeInactive: boolean): Promise<InsuranceOptionRow[]> {
	let q = sb().from('insurance_options').select('*');
	if (includeInactive) {
		q = q.order('active', { ascending: false });
	}
	q = q.order('sort_order', { ascending: true }).order('label', { ascending: true });
	if (!includeInactive) {
		q = q.eq('active', true);
	}
	const { data, error } = await q;
	if (error) throw error;
	return (data || []) as InsuranceOptionRow[];
}

export async function getInsuranceOption(id: string): Promise<InsuranceOptionRow | null> {
	const { data, error } = await sb().from('insurance_options').select('*').eq('id', id).maybeSingle();
	if (error) throw error;
	return (data as InsuranceOptionRow) || null;
}

export async function createInsuranceOption(input: {
	slug: string;
	label: string;
	sort_order?: number;
	active?: boolean;
	copay_estimate?: number | null;
}): Promise<InsuranceOptionRow> {
	const slug = normalizeSlug(input.slug);
	assertValidSlug(slug);
	const label = input.label.trim();
	if (!label) {
		throw Object.assign(new Error('label is required'), { status: 400 });
	}
	const row = {
		slug,
		label,
		sort_order: input.sort_order ?? 0,
		active: input.active !== false,
		copay_estimate:
			input.copay_estimate === undefined || input.copay_estimate === null
				? null
				: Number(input.copay_estimate),
		updated_at: new Date().toISOString(),
	};
	const { data, error } = await sb().from('insurance_options').insert(row).select('*').single();
	if (error) {
		if (error.code === '23505') {
			throw Object.assign(new Error('slug already exists'), { status: 409 });
		}
		throw error;
	}
	return data as InsuranceOptionRow;
}

export async function updateInsuranceOption(
	id: string,
	patch: Partial<{ label: string; sort_order: number; active: boolean; copay_estimate: number | null }>,
): Promise<InsuranceOptionRow> {
	const existing = await getInsuranceOption(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (patch.label !== undefined) {
		const l = patch.label.trim();
		if (!l) throw Object.assign(new Error('label cannot be empty'), { status: 400 });
		updates.label = l;
	}
	if (patch.sort_order !== undefined) updates.sort_order = patch.sort_order;
	if (patch.active !== undefined) updates.active = patch.active;
	if (patch.copay_estimate !== undefined) updates.copay_estimate = patch.copay_estimate;
	const { data, error } = await sb().from('insurance_options').update(updates).eq('id', id).select('*').single();
	if (error) throw error;
	return data as InsuranceOptionRow;
}

export async function deactivateInsuranceOption(id: string): Promise<InsuranceOptionRow> {
	return updateInsuranceOption(id, { active: false });
}

/** Catalog for patient booking UI (server-side read). */
export async function getAppointmentCatalog(): Promise<{
	visitTypes: VisitTypeRow[];
	insuranceOptions: InsuranceOptionRow[];
	providers: Array<{
		id: string;
		name: string;
		provider_name: string | null;
		type: string | null;
		specialty: string | null;
		email: string | null;
		address: string | null;
	}>;
}> {
	const [visitTypes, insuranceOptions, providersRes] = await Promise.all([
		listVisitTypes(false),
		listInsuranceOptions(false),
		sb()
			.from('providers')
			.select('id, name, provider_name, type, specialty, email, address')
			.eq('status', 'active')
			.eq('verification_status', 'verified')
			.order('name', { ascending: true }),
	]);
	if (providersRes.error) throw providersRes.error;
	type Prov = {
		id: string;
		name: string;
		provider_name: string | null;
		type: string | null;
		specialty: string | null;
		email: string | null;
		address: string | null;
	};
	return {
		visitTypes,
		insuranceOptions,
		providers: (providersRes.data || []) as Prov[],
	};
}
