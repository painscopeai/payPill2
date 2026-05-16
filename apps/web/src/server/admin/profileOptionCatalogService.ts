import { getSupabaseAdmin } from '@/server/supabase/admin';
import { PROFILE_OPTION_GROUP_LABELS } from '@/lib/profileOptionGroupLabels';

function sb() {
	return getSupabaseAdmin();
}

const KEY_RE = /^[a-z0-9_-]+$/;

export type OptionSetRow = {
	id: string;
	key: string;
	label: string;
	description: string | null;
	group_slug: string;
	sort_order: number;
	active: boolean;
	created_at: string;
	updated_at: string;
};

export type OptionValueRow = {
	id: string;
	set_id: string;
	slug: string;
	label: string;
	sort_order: number;
	active: boolean;
	metadata: Record<string, unknown>;
	created_at: string;
	updated_at: string;
};

export function normalizeKey(raw: string): string {
	return raw.trim().toLowerCase();
}

export function assertValidKey(key: string): void {
	if (!key || !KEY_RE.test(key)) {
		throw Object.assign(new Error('key must be lowercase letters, digits, hyphen or underscore'), { status: 400 });
	}
}

export async function listOptionSets(includeInactive: boolean): Promise<OptionSetRow[]> {
	let q = sb().from('profile_option_sets').select('*');
	if (!includeInactive) {
		q = q.eq('active', true);
	}
	q = q.order('group_slug', { ascending: true }).order('sort_order', { ascending: true }).order('label', { ascending: true });
	const { data, error } = await q;
	if (error) throw error;
	return (data || []) as OptionSetRow[];
}

export async function getOptionSetById(id: string): Promise<OptionSetRow | null> {
	const { data, error } = await sb().from('profile_option_sets').select('*').eq('id', id).maybeSingle();
	if (error) throw error;
	return (data as OptionSetRow) || null;
}

export async function getOptionSetByKey(key: string): Promise<OptionSetRow | null> {
	const k = normalizeKey(key);
	const { data, error } = await sb().from('profile_option_sets').select('*').eq('key', k).maybeSingle();
	if (error) throw error;
	return (data as OptionSetRow) || null;
}

export async function createOptionSet(input: {
	key: string;
	label: string;
	description?: string | null;
	group_slug?: string;
	sort_order?: number;
	active?: boolean;
}): Promise<OptionSetRow> {
	const key = normalizeKey(input.key);
	assertValidKey(key);
	const label = input.label.trim();
	if (!label) throw Object.assign(new Error('label is required'), { status: 400 });
	const row = {
		key,
		label,
		description: input.description ?? null,
		group_slug: input.group_slug?.trim() || 'general',
		sort_order: input.sort_order ?? 0,
		active: input.active !== false,
		updated_at: new Date().toISOString(),
	};
	const { data, error } = await sb().from('profile_option_sets').insert(row).select('*').single();
	if (error) {
		if (error.code === '23505') {
			throw Object.assign(new Error('key already exists'), { status: 409 });
		}
		throw error;
	}
	return data as OptionSetRow;
}

export async function updateOptionSet(
	id: string,
	patch: Partial<{ label: string; description: string | null; group_slug: string; sort_order: number; active: boolean }>,
): Promise<OptionSetRow> {
	const existing = await getOptionSetById(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (patch.label !== undefined) {
		const l = patch.label.trim();
		if (!l) throw Object.assign(new Error('label cannot be empty'), { status: 400 });
		updates.label = l;
	}
	if (patch.description !== undefined) updates.description = patch.description;
	if (patch.group_slug !== undefined) updates.group_slug = patch.group_slug.trim() || 'general';
	if (patch.sort_order !== undefined) updates.sort_order = patch.sort_order;
	if (patch.active !== undefined) updates.active = patch.active;
	const { data, error } = await sb().from('profile_option_sets').update(updates).eq('id', id).select('*').single();
	if (error) throw error;
	return data as OptionSetRow;
}

export async function deactivateOptionSet(id: string): Promise<OptionSetRow> {
	return updateOptionSet(id, { active: false });
}

export async function deleteOptionSet(id: string): Promise<void> {
	const existing = await getOptionSetById(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	const { error } = await sb().from('profile_option_sets').delete().eq('id', id);
	if (error) throw error;
}

export async function listOptionValuesForSet(
	setId: string,
	includeInactive: boolean,
): Promise<OptionValueRow[]> {
	let q = sb().from('profile_option_values').select('*').eq('set_id', setId);
	if (!includeInactive) {
		q = q.eq('active', true);
	}
	q = q.order('sort_order', { ascending: true }).order('label', { ascending: true });
	const { data, error } = await q;
	if (error) throw error;
	return (data || []) as OptionValueRow[];
}

export async function getOptionValue(id: string): Promise<OptionValueRow | null> {
	const { data, error } = await sb().from('profile_option_values').select('*').eq('id', id).maybeSingle();
	if (error) throw error;
	return (data as OptionValueRow) || null;
}

export async function createOptionValue(input: {
	set_id: string;
	slug: string;
	label: string;
	sort_order?: number;
	active?: boolean;
	metadata?: Record<string, unknown>;
}): Promise<OptionValueRow> {
	const slug = normalizeKey(input.slug);
	assertValidKey(slug);
	const label = input.label.trim();
	if (!label) throw Object.assign(new Error('label is required'), { status: 400 });
	const row = {
		set_id: input.set_id,
		slug,
		label,
		sort_order: input.sort_order ?? 0,
		active: input.active !== false,
		metadata: input.metadata ?? {},
		updated_at: new Date().toISOString(),
	};
	const { data, error } = await sb().from('profile_option_values').insert(row).select('*').single();
	if (error) {
		if (error.code === '23505') {
			throw Object.assign(new Error('slug already exists for this set'), { status: 409 });
		}
		throw error;
	}
	return data as OptionValueRow;
}

export async function updateOptionValue(
	id: string,
	patch: Partial<{ label: string; sort_order: number; active: boolean; metadata: Record<string, unknown> }>,
): Promise<OptionValueRow> {
	const existing = await getOptionValue(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (patch.label !== undefined) {
		const l = patch.label.trim();
		if (!l) throw Object.assign(new Error('label cannot be empty'), { status: 400 });
		updates.label = l;
	}
	if (patch.sort_order !== undefined) updates.sort_order = patch.sort_order;
	if (patch.active !== undefined) updates.active = patch.active;
	if (patch.metadata !== undefined) updates.metadata = patch.metadata;
	const { data, error } = await sb().from('profile_option_values').update(updates).eq('id', id).select('*').single();
	if (error) throw error;
	return data as OptionValueRow;
}

export async function deactivateOptionValue(id: string): Promise<OptionValueRow> {
	return updateOptionValue(id, { active: false });
}

export async function deleteOptionValue(id: string): Promise<void> {
	const existing = await getOptionValue(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	const { error } = await sb().from('profile_option_values').delete().eq('id', id);
	if (error) throw error;
}

/** Public catalog: active values keyed by set key (machine key). */
export async function getCatalogForKeys(keys: string[]): Promise<Record<string, Pick<OptionValueRow, 'slug' | 'label' | 'sort_order'>[]>> {
	if (!keys.length) return {};
	const normalized = [...new Set(keys.map((k) => normalizeKey(k)).filter(Boolean))];
	const { data: sets, error: setErr } = await sb()
		.from('profile_option_sets')
		.select('id, key')
		.in('key', normalized)
		.eq('active', true);
	if (setErr) throw setErr;
	const setRows = (sets || []) as { id: string; key: string }[];
	if (setRows.length === 0) {
		const empty: Record<string, Pick<OptionValueRow, 'slug' | 'label' | 'sort_order'>[]> = {};
		for (const k of normalized) empty[k] = [];
		return empty;
	}

	const { data: vals, error: valErr } = await sb()
		.from('profile_option_values')
		.select('set_id, slug, label, sort_order')
		.in(
			'set_id',
			setRows.map((s) => s.id),
		)
		.eq('active', true);
	if (valErr) throw valErr;

	const valList = (vals || []) as Pick<OptionValueRow, 'set_id' | 'slug' | 'label' | 'sort_order'>[];
	valList.sort((a, b) => {
		const ao = a.sort_order ?? 0;
		const bo = b.sort_order ?? 0;
		if (ao !== bo) return ao - bo;
		return String(a.label).localeCompare(String(b.label));
	});

	const keyById = new Map(setRows.map((s) => [s.id, s.key]));
	const out: Record<string, Pick<OptionValueRow, 'slug' | 'label' | 'sort_order'>[]> = {};
	for (const k of normalized) {
		out[k] = [];
	}
	for (const row of valList) {
		const key = keyById.get(row.set_id as string);
		if (!key) continue;
		if (!out[key]) out[key] = [];
		out[key].push({
			slug: row.slug as string,
			label: row.label as string,
			sort_order: row.sort_order as number,
		});
	}
	return out;
}

export const GROUP_LABELS = PROFILE_OPTION_GROUP_LABELS;
