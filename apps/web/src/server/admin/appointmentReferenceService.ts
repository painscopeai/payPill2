import { getSupabaseAdmin } from '@/server/supabase/admin';
import { listProviderTypes, slugFromLabel } from '@/server/admin/providerTypeService';

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

async function nextVisitTypeSortOrder(): Promise<number> {
	const { data, error } = await sb()
		.from('visit_types')
		.select('sort_order')
		.order('sort_order', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw error;
	const row = data as { sort_order?: number } | null;
	return (typeof row?.sort_order === 'number' ? row.sort_order : 0) + 1;
}

async function ensureUniqueVisitTypeSlug(base: string): Promise<string> {
	let candidate = base;
	let n = 2;
	for (;;) {
		assertValidSlug(candidate);
		const { data, error } = await sb().from('visit_types').select('id').eq('slug', candidate).maybeSingle();
		if (error) throw error;
		if (!data) return candidate;
		const suffix = `_${n}`;
		candidate = `${base.slice(0, Math.max(1, 48 - suffix.length))}${suffix}`;
		n += 1;
	}
}

export async function createVisitType(input: {
	slug?: string;
	label: string;
	sort_order?: number;
	active?: boolean;
}): Promise<VisitTypeRow> {
	const label = input.label.trim();
	if (!label) {
		throw Object.assign(new Error('label is required'), { status: 400 });
	}
	const slugBase = input.slug?.trim() ? normalizeSlug(input.slug) : slugFromLabel(label);
	const slug = await ensureUniqueVisitTypeSlug(slugBase);
	const sort_order =
		typeof input.sort_order === 'number' && Number.isFinite(input.sort_order)
			? input.sort_order
			: await nextVisitTypeSortOrder();
	const row = {
		slug,
		label,
		sort_order,
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

export async function deleteVisitType(id: string): Promise<void> {
	const existing = await getVisitType(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	const { error } = await sb().from('visit_types').delete().eq('id', id);
	if (error) throw error;
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

export type CopayMatrixRow = {
	id: string;
	visit_type_id: string;
	insurance_option_id: string;
	copay_estimate: number;
	list_price: number | null;
	active: boolean;
	created_at: string;
	updated_at: string;
};

/** Active matrix row + optional list price; server-only resolution for booking. */
export type CopayMatrixCatalogEntry = {
	visit_type_id: string;
	insurance_option_id: string;
	copay_estimate: number;
	list_price: number | null;
};

export async function getVisitTypeBySlug(slug: string): Promise<VisitTypeRow | null> {
	const s = normalizeSlug(slug || '');
	if (!s) return null;
	const { data, error } = await sb().from('visit_types').select('*').eq('slug', s).maybeSingle();
	if (error) throw error;
	return (data as VisitTypeRow) || null;
}

/**
 * Resolve estimated copay: active matrix cell → insurance default copay → 0.
 */
export async function resolveCopayEstimate(input: {
	visitTypeId: string;
	insuranceOptionId: string;
}): Promise<{ copay_estimate: number; list_price: number | null; source: 'matrix' | 'insurance_fallback' | 'zero' }> {
	const { visitTypeId, insuranceOptionId } = input;
	const { data: matrixRow, error: mErr } = await sb()
		.from('appointment_copay_matrix')
		.select('copay_estimate, list_price')
		.eq('visit_type_id', visitTypeId)
		.eq('insurance_option_id', insuranceOptionId)
		.eq('active', true)
		.maybeSingle();
	if (mErr) throw mErr;

	if (matrixRow) {
		const r = matrixRow as { copay_estimate: number; list_price: number | null };
		return {
			copay_estimate: Number(r.copay_estimate),
			list_price: r.list_price != null ? Number(r.list_price) : null,
			source: 'matrix',
		};
	}

	const ins = await getInsuranceOption(insuranceOptionId);
	if (ins?.copay_estimate != null) {
		return {
			copay_estimate: Number(ins.copay_estimate),
			list_price: null,
			source: 'insurance_fallback',
		};
	}

	return { copay_estimate: 0, list_price: null, source: 'zero' };
}

/** Admin: all matrix rows (optionally inactive). */
export async function listCopayMatrix(includeInactive: boolean): Promise<CopayMatrixRow[]> {
	let q = sb().from('appointment_copay_matrix').select('*');
	if (!includeInactive) {
		q = q.eq('active', true);
	}
	q = q.order('created_at', { ascending: true });
	const { data, error } = await q;
	if (error) throw error;
	return (data || []) as CopayMatrixRow[];
}

export async function getCopayMatrixRow(id: string): Promise<CopayMatrixRow | null> {
	const { data, error } = await sb().from('appointment_copay_matrix').select('*').eq('id', id).maybeSingle();
	if (error) throw error;
	return (data as CopayMatrixRow) || null;
}

export async function createCopayMatrix(input: {
	visit_type_id: string;
	insurance_option_id: string;
	copay_estimate: number;
	list_price?: number | null;
	active?: boolean;
}): Promise<CopayMatrixRow> {
	const vt = await getVisitType(input.visit_type_id);
	const io = await getInsuranceOption(input.insurance_option_id);
	if (!vt) throw Object.assign(new Error('visit type not found'), { status: 400 });
	if (!io) throw Object.assign(new Error('insurance option not found'), { status: 400 });

	const row = {
		visit_type_id: input.visit_type_id,
		insurance_option_id: input.insurance_option_id,
		copay_estimate: Number(input.copay_estimate),
		list_price:
			input.list_price === undefined || input.list_price === null ? null : Number(input.list_price),
		active: input.active !== false,
		updated_at: new Date().toISOString(),
	};
	const { data, error } = await sb().from('appointment_copay_matrix').insert(row).select('*').single();
	if (error) {
		if (error.code === '23505') {
			throw Object.assign(new Error('A row for this visit type and insurance already exists'), {
				status: 409,
			});
		}
		throw error;
	}
	return data as CopayMatrixRow;
}

export async function updateCopayMatrix(
	id: string,
	patch: Partial<{
		copay_estimate: number;
		list_price: number | null;
		active: boolean;
	}>,
): Promise<CopayMatrixRow> {
	const existing = await getCopayMatrixRow(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (patch.copay_estimate !== undefined) updates.copay_estimate = Number(patch.copay_estimate);
	if (patch.list_price !== undefined) updates.list_price = patch.list_price;
	if (patch.active !== undefined) updates.active = patch.active;
	const { data, error } = await sb()
		.from('appointment_copay_matrix')
		.update(updates)
		.eq('id', id)
		.select('*')
		.single();
	if (error) throw error;
	return data as CopayMatrixRow;
}

/** Public catalog: active matrix rows for client-side copay display (advisory). */
export async function listCopayMatrixCatalog(): Promise<CopayMatrixCatalogEntry[]> {
	const { data, error } = await sb()
		.from('appointment_copay_matrix')
		.select('visit_type_id, insurance_option_id, copay_estimate, list_price')
		.eq('active', true);
	if (error) throw error;
	return ((data || []) as CopayMatrixCatalogEntry[]).map((r) => ({
		visit_type_id: r.visit_type_id,
		insurance_option_id: r.insurance_option_id,
		copay_estimate: Number(r.copay_estimate),
		list_price: r.list_price != null ? Number(r.list_price) : null,
	}));
}

/** Active catalog lines exposed on booking when a provider is selected. */
export type ProviderCatalogService = {
	id: string;
	name: string;
	category: string;
	unit: string;
	price: number;
	currency: string;
	notes: string | null;
	sort_order: number;
	/** Published consent form linked to this catalog row (patient booking). */
	consentForm?: { id: string; name: string } | null;
	/** Published service-intake form linked to this catalog row. */
	intakeForm?: { id: string; name: string } | null;
};

type FormMini = { id: string; name: string; status: string; form_type: string };

async function publishedServiceFormsByServiceId(
	serviceIds: string[],
): Promise<Map<string, { consent: { id: string; name: string } | null; intake: { id: string; name: string } | null }>> {
	const out = new Map<
		string,
		{ consent: { id: string; name: string } | null; intake: { id: string; name: string } | null }
	>();
	if (!serviceIds.length) return out;
	for (const id of serviceIds) {
		out.set(id, { consent: null, intake: null });
	}
	const { data: attRows, error } = await sb()
		.from('provider_service_form_attachments')
		.select('provider_service_id, attachment_kind, forms ( id, name, status, form_type )')
		.in('provider_service_id', serviceIds);
	if (error) throw error;
	for (const raw of attRows || []) {
		const row = raw as {
			provider_service_id: string;
			attachment_kind: string;
			forms: FormMini | FormMini[] | null;
		};
		const f = Array.isArray(row.forms) ? row.forms[0] : row.forms;
		if (!f || f.status !== 'published') continue;
		const slot = out.get(row.provider_service_id);
		if (!slot) continue;
		const mini = { id: f.id, name: f.name };
		if (row.attachment_kind === 'consent' && f.form_type === 'consent') slot.consent = mini;
		if (row.attachment_kind === 'intake' && f.form_type === 'service_intake') slot.intake = mini;
	}
	return out;
}

export type AppointmentCatalogSpecialty = { slug: string; label: string };

function resolveProviderSpecialtySlug(
	type: string | null,
	specialtyText: string | null,
	labelToSlug: Map<string, string>,
	validSlugs: Set<string>,
): string | null {
	const fromType = (type || '').trim().toLowerCase();
	if (fromType && validSlugs.has(fromType)) return fromType;
	const text = (specialtyText || '').trim();
	if (!text) return null;
	const lower = text.toLowerCase();
	if (validSlugs.has(lower)) return lower;
	return labelToSlug.get(lower) || null;
}

/** Catalog for patient booking UI (server-side read). */
export async function getAppointmentCatalog(): Promise<{
	visitTypes: VisitTypeRow[];
	insuranceOptions: InsuranceOptionRow[];
	copayMatrix: CopayMatrixCatalogEntry[];
	specialties: AppointmentCatalogSpecialty[];
	providers: Array<{
		id: string;
		name: string;
		provider_name: string | null;
		type: string | null;
		specialty: string | null;
		specialty_slug: string | null;
		email: string | null;
		address: string | null;
		scheduling_url: string | null;
		services: ProviderCatalogService[];
	}>;
}> {
	const [visitTypes, insuranceOptions, copayMatrix, providerTypeRows, linkedOrgRes] = await Promise.all([
		listVisitTypes(false),
		listInsuranceOptions(false),
		listCopayMatrixCatalog(),
		listProviderTypes(false),
		sb()
			.from('profiles')
			.select('provider_org_id, specialty')
			.eq('role', 'provider')
			.eq('provider_onboarding_completed', true)
			.not('provider_org_id', 'is', null),
	]);
	const validSlugs = new Set(providerTypeRows.map((t) => t.slug));
	const labelToSlug = new Map<string, string>();
	for (const t of providerTypeRows) {
		labelToSlug.set(t.label.trim().toLowerCase(), t.slug);
	}
	if (linkedOrgRes.error) throw linkedOrgRes.error;
	const linkRows = (linkedOrgRes.data || []) as { provider_org_id: string | null; specialty: string | null }[];
	const orgIds = [
		...new Set(
			linkRows.map((r) => r.provider_org_id).filter((id): id is string => Boolean(id)),
		),
	];
	const specialtyByOrg = new Map<string, string>();
	for (const r of linkRows) {
		const oid = r.provider_org_id;
		if (!oid) continue;
		const s = (r.specialty || '').trim();
		if (s && !specialtyByOrg.has(oid)) specialtyByOrg.set(oid, s);
	}

	let providersRes: { data: unknown[] | null; error: { message: string } | null };
	if (orgIds.length === 0) {
		providersRes = { data: [], error: null };
	} else {
		const res = await sb()
			.from('providers')
			.select('id, name, provider_name, type, specialty, email, address, scheduling_url')
			.in('id', orgIds)
			.order('name', { ascending: true });
		providersRes = res;
	}
	if (providersRes.error) throw providersRes.error;
	type Prov = {
		id: string;
		name: string;
		provider_name: string | null;
		type: string | null;
		specialty: string | null;
		email: string | null;
		address: string | null;
		scheduling_url: string | null;
	};
	const baseProviders = (providersRes.data || []) as Prov[];
	const providerIds = baseProviders.map((p) => p.id);

	const servicesByProvider = new Map<string, ProviderCatalogService[]>();
	if (providerIds.length > 0) {
		const { data: svcRows, error: svcErr } = await sb()
			.from('provider_services')
			.select('id, provider_id, name, category, unit, price, currency, notes, sort_order')
			.in('provider_id', providerIds)
			.eq('is_active', true);
		if (svcErr) throw svcErr;
		type SvcRow = {
			id: string;
			provider_id: string | null;
			name: string;
			category: string;
			unit: string;
			price: number | string;
			currency: string;
			notes: string | null;
			sort_order: number | null;
		};
		const sorted = ((svcRows || []) as SvcRow[])
			.filter((r) => r.provider_id)
			.sort((a, b) => {
				const sa = a.sort_order ?? 0;
				const sb = b.sort_order ?? 0;
				if (sa !== sb) return sa - sb;
				return (a.name || '').localeCompare(b.name || '');
			});
		for (const r of sorted) {
			const pid = r.provider_id as string;
			const row: ProviderCatalogService = {
				id: r.id,
				name: r.name,
				category: r.category,
				unit: r.unit,
				price: typeof r.price === 'number' ? r.price : Number(r.price),
				currency: r.currency || 'USD',
				notes: r.notes,
				sort_order: r.sort_order ?? 0,
			};
			const list = servicesByProvider.get(pid) || [];
			list.push(row);
			servicesByProvider.set(pid, list);
		}

		const allServiceIds = sorted.map((r) => r.id);
		const publishedBySvc = await publishedServiceFormsByServiceId(allServiceIds);
		for (const [, list] of servicesByProvider) {
			for (const svc of list) {
				const pub = publishedBySvc.get(svc.id);
				svc.consentForm = pub?.consent ?? null;
				svc.intakeForm = pub?.intake ?? null;
			}
		}
	}

	const providers = baseProviders.map((p) => {
		const specFromProfile = specialtyByOrg.get(p.id);
		const specialty =
			(p.specialty && String(p.specialty).trim()) || (specFromProfile && specFromProfile.trim()) || null;
		const specialty_slug = resolveProviderSpecialtySlug(p.type, specialty, labelToSlug, validSlugs);
		const typeRow = specialty_slug ? providerTypeRows.find((t) => t.slug === specialty_slug) : null;
		return {
			...p,
			specialty: typeRow?.label || specialty,
			specialty_slug,
			services: servicesByProvider.get(p.id) || [],
		};
	});

	const slugsInUse = new Set(
		providers.map((p) => p.specialty_slug).filter((s): s is string => Boolean(s)),
	);
	const specialties: AppointmentCatalogSpecialty[] = providerTypeRows
		.filter((t) => slugsInUse.has(t.slug))
		.map((t) => ({ slug: t.slug, label: t.label }));

	return {
		visitTypes,
		insuranceOptions,
		copayMatrix,
		specialties,
		providers,
	};
}
