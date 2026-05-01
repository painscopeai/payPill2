import { supabase } from '@/lib/supabaseClient.js';

/** Map DB rows to legacy PocketBase-like shape (created field). */
export function withLegacyDates(rows) {
	if (!rows) return [];
	return rows.map((r) => ({
		...r,
		created: r.created_at ?? r.created,
		updated: r.updated_at ?? r.updated,
	}));
}

/**
 * Paginated list for admin tables (Supabase).
 * @param {string} table
 * @param {number} page 1-based
 * @param {number} pageSize
 * @param {{ searchColumn?: string, searchTerm?: string, statusColumn?: string, statusFilter?: string, extraEq?: Record<string,string> }} filters
 */
export async function adminPagedList(table, page, pageSize, filters = {}) {
	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;
	let q = supabase.from(table).select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);

	if (filters.searchTerm && filters.searchColumn) {
		q = q.ilike(filters.searchColumn, `%${filters.searchTerm}%`);
	}
	if (filters.statusFilter && filters.statusFilter !== 'all' && filters.statusColumn) {
		q = q.eq(filters.statusColumn, filters.statusFilter);
	}
	if (filters.extraEq) {
		for (const [k, v] of Object.entries(filters.extraEq)) {
			q = q.eq(k, v);
		}
	}
	/** OR of ilike clauses, e.g. first_name, last_name, email */
	if (filters.orIlike?.columns?.length && filters.orIlike.term) {
		const raw = String(filters.orIlike.term).replace(/%/g, '');
		if (raw) {
			const clauses = filters.orIlike.columns.map((c) => `${c}.ilike.%${raw}%`).join(',');
			q = q.or(clauses);
		}
	}

	const { data, error, count } = await q;
	if (error) throw error;
	const total = count ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	return { items: withLegacyDates(data || []), totalPages, total };
}

export async function adminCountExact(table, filter) {
	let q = supabase.from(table).select('*', { count: 'exact', head: true });
	if (filter?.column && filter?.value) {
		q = q.eq(filter.column, filter.value);
	}
	const { count, error } = await q;
	if (error) {
		console.warn(`[adminCountExact] ${table}:`, error.message);
		return 0;
	}
	return count ?? 0;
}

export async function adminListRecent(table, limit, orderBy = 'created_at') {
	const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending: false }).limit(limit);
	if (error) {
		console.warn(`[adminListRecent] ${table}:`, error.message);
		return [];
	}
	return withLegacyDates(data || []);
}
