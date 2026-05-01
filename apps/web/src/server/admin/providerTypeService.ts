import { getSupabaseAdmin } from '@/server/supabase/admin';

export type ProviderTypeRow = {
	id: string;
	slug: string;
	label: string;
	sort_order: number;
	active: boolean;
	created_at: string;
	updated_at: string;
};

function sb() {
	return getSupabaseAdmin();
}

const SLUG_RE = /^[a-z0-9_-]+$/;

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
	slug: string;
	label: string;
	sort_order?: number;
	active?: boolean;
}): Promise<ProviderTypeRow> {
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
	patch: Partial<{ label: string; sort_order: number; active: boolean }>,
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
	const { data, error } = await sb().from('provider_types').update(updates).eq('id', id).select('*').single();
	if (error) throw error;
	return data as ProviderTypeRow;
}

/** Soft-delete: sets active = false */
export async function deactivateProviderType(id: string): Promise<ProviderTypeRow> {
	return updateProviderType(id, { active: false });
}
