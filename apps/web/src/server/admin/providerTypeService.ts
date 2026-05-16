import { getSupabaseAdmin } from '@/server/supabase/admin';
import type { OperationsProfile } from '@/server/provider/syncPracticeRoleFromProviderType';

export type ProviderTypeRow = {
	id: string;
	slug: string;
	label: string;
	sort_order: number;
	active: boolean;
	operations_profile: OperationsProfile;
	created_at: string;
	updated_at: string;
};

const OPERATIONS_PROFILES: OperationsProfile[] = ['doctor', 'pharmacist', 'laboratory'];

export function assertValidOperationsProfile(value: string): OperationsProfile {
	const v = value.trim().toLowerCase() as OperationsProfile;
	if (!OPERATIONS_PROFILES.includes(v)) {
		throw Object.assign(new Error('operations_profile must be doctor, pharmacist, or laboratory'), {
			status: 400,
		});
	}
	return v;
}

export function defaultOperationsProfileForSlug(slug: string): OperationsProfile {
	const s = slug.trim().toLowerCase();
	if (s === 'pharmacy') return 'pharmacist';
	if (s === 'laboratory' || s === 'lab') return 'laboratory';
	return 'doctor';
}

/** Default provider_types.slug for self-serve signup when the user picks an operations profile only. */
export async function resolveDefaultProviderTypeSlugForOperationsProfile(
	profile: OperationsProfile,
): Promise<string> {
	const preferred =
		profile === 'pharmacist' ? 'pharmacy' : profile === 'laboratory' ? 'laboratory' : 'clinic';

	const { data: preferredRow, error: prefErr } = await sb()
		.from('provider_types')
		.select('slug')
		.eq('slug', preferred)
		.eq('active', true)
		.maybeSingle();
	if (prefErr) throw prefErr;
	if (preferredRow?.slug) return String(preferredRow.slug);

	const { data: rows, error: listErr } = await sb()
		.from('provider_types')
		.select('slug')
		.eq('operations_profile', profile)
		.eq('active', true)
		.order('sort_order', { ascending: true })
		.limit(1);
	if (listErr) throw listErr;
	const first = rows?.[0] as { slug?: string } | undefined;
	if (first?.slug) return String(first.slug);

	return preferred;
}

function sb() {
	return getSupabaseAdmin();
}

const SLUG_RE = /^[a-z0-9_-]+$/;

export function normalizeSlug(raw: string): string {
	return raw.trim().toLowerCase();
}

/** Derive a URL-safe slug from a display label when admins do not supply one. */
export function slugFromLabel(label: string): string {
	const base = label
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 48);
	return base || 'specialty';
}

async function ensureUniqueSlug(base: string): Promise<string> {
	let candidate = base;
	let n = 2;
	for (;;) {
		assertValidSlug(candidate);
		const { data, error } = await sb().from('provider_types').select('id').eq('slug', candidate).maybeSingle();
		if (error) throw error;
		if (!data) return candidate;
		const suffix = `_${n}`;
		candidate = `${base.slice(0, Math.max(1, 48 - suffix.length))}${suffix}`;
		n += 1;
	}
}

async function nextProviderTypeSortOrder(): Promise<number> {
	const { data, error } = await sb()
		.from('provider_types')
		.select('sort_order')
		.order('sort_order', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw error;
	const row = data as { sort_order?: number } | null;
	return (typeof row?.sort_order === 'number' ? row.sort_order : 0) + 1;
}

export function assertValidSlug(slug: string): void {
	if (!slug || !SLUG_RE.test(slug)) {
		throw Object.assign(new Error('slug must be lowercase letters, digits, hyphen or underscore'), {
			status: 400,
		});
	}
}

export async function listProviderTypes(includeInactive: boolean): Promise<ProviderTypeRow[]> {
	let q = sb().from('provider_types').select('*');
	if (includeInactive) {
		// Management screen: active rows first, then sort_order / label
		q = q.order('active', { ascending: false });
	}
	q = q.order('sort_order', { ascending: true }).order('label', { ascending: true });
	if (!includeInactive) {
		q = q.eq('active', true);
	}
	const { data, error } = await q;
	if (error) throw error;
	return (data || []) as ProviderTypeRow[];
}

export async function getProviderType(id: string): Promise<ProviderTypeRow | null> {
	const { data, error } = await sb().from('provider_types').select('*').eq('id', id).maybeSingle();
	if (error) throw error;
	return (data as ProviderTypeRow) || null;
}

export async function createProviderType(input: {
	slug?: string;
	label: string;
	sort_order?: number;
	active?: boolean;
	operations_profile?: OperationsProfile;
}): Promise<ProviderTypeRow> {
	const label = input.label.trim();
	if (!label) {
		throw Object.assign(new Error('label is required'), { status: 400 });
	}
	const slugBase = input.slug?.trim() ? normalizeSlug(input.slug) : slugFromLabel(label);
	const slug = await ensureUniqueSlug(slugBase);
	const operations_profile = input.operations_profile
		? assertValidOperationsProfile(input.operations_profile)
		: defaultOperationsProfileForSlug(slug);
	const sort_order =
		typeof input.sort_order === 'number' && Number.isFinite(input.sort_order)
			? input.sort_order
			: await nextProviderTypeSortOrder();
	const row = {
		slug,
		label,
		sort_order,
		active: input.active !== false,
		operations_profile,
		updated_at: new Date().toISOString(),
	};
	const { data, error } = await sb().from('provider_types').insert(row).select('*').single();
	if (error) {
		if (error.code === '23505') {
			throw Object.assign(new Error('slug already exists'), { status: 409 });
		}
		throw error;
	}
	return data as ProviderTypeRow;
}

export async function updateProviderType(
	id: string,
	patch: Partial<{ label: string; sort_order: number; active: boolean; operations_profile: OperationsProfile }>,
): Promise<ProviderTypeRow> {
	const existing = await getProviderType(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (patch.label !== undefined) {
		const l = patch.label.trim();
		if (!l) throw Object.assign(new Error('label cannot be empty'), { status: 400 });
		updates.label = l;
	}
	if (patch.sort_order !== undefined) updates.sort_order = patch.sort_order;
	if (patch.active !== undefined) updates.active = patch.active;
	if (patch.operations_profile !== undefined) {
		updates.operations_profile = assertValidOperationsProfile(patch.operations_profile);
	}
	const { data, error } = await sb().from('provider_types').update(updates).eq('id', id).select('*').single();
	if (error) throw error;
	return data as ProviderTypeRow;
}

/** Soft-delete: sets active = false */
export async function deactivateProviderType(id: string): Promise<ProviderTypeRow> {
	return updateProviderType(id, { active: false });
}

/** Permanent delete — row is removed from admin lists. */
export async function deleteProviderType(id: string): Promise<void> {
	const existing = await getProviderType(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	const { error } = await sb().from('provider_types').delete().eq('id', id);
	if (error) throw error;
}
