/**
 * Supabase-backed helpers with a PocketBase-shaped API for gradual migration.
 * Prefer `supabase` from `@/lib/supabaseClient` and `apiServerClient` for new code.
 */
import { supabase } from '@/lib/supabaseClient';

const COLLECTION_TO_TABLE = {
	users: 'profiles',
	recommendations: 'patient_recommendations',
	appointments: 'appointments',
	pharmacies: 'pharmacies',
	prescriptions: 'prescriptions',
	refill_requests: 'refill_requests',
	health_goals: 'health_goals',
	patient_health_records: 'patient_health_records',
	lab_results: 'lab_results',
	patient_provider_relationships: 'patient_provider_relationships',
	provider_profiles: 'providers',
	employers: 'employers',
	employer_employees: 'employer_employees',
	employer_health_metrics: 'employer_health_metrics',
};

function toSnake(s) {
	if (s === 'userId') return 'user_id';
	if (s === 'providerId') return 'provider_id';
	if (s === 'prescriptionId') return 'prescription_id';
	if (s === 'appointmentId') return 'appointment_id';
	return s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function mapKeysToSnake(obj) {
	if (!obj || typeof obj !== 'object') return obj;
	const out = {};
	for (const [k, v] of Object.entries(obj)) {
		out[toSnake(k)] = v;
	}
	return out;
}

function parseFilter(filter) {
	if (!filter) return {};
	const pairs = {};
	for (const part of String(filter).split('&&')) {
		const p = part.trim();
		if (!p) continue;
		const m = p.match(/^(\w+)\s*=\s*["']([^"']+)["']$/);
		if (m) pairs[m[1]] = m[2];
	}
	return pairs;
}

function filterToQuery(qb, filter) {
	const pairs = parseFilter(filter);
	for (const [k, v] of Object.entries(pairs)) {
		const col = toSnake(k);
		qb = qb.eq(col, v);
	}
	return qb;
}

function sortToOrder(sort) {
	if (!sort) return { column: 'created_at', ascending: false };
	const desc = sort.startsWith('-');
	const raw = desc ? sort.slice(1) : sort;
	const colMap = {
		created: 'created_at',
		updated: 'updated_at',
		appointment_date: 'appointment_date',
		date_tested: 'test_date',
		activity_date: 'activity_date',
		requested_at: 'requested_at',
	};
	const column = colMap[raw] || toSnake(raw) || 'created_at';
	return { column, ascending: !desc };
}

function emptyList() {
	return [];
}

function collectionApi(collectionName) {
	const table = COLLECTION_TO_TABLE[collectionName];

	async function getFullList(opts = {}) {
		if (!table) {
			console.warn(`[supabaseMappedCollections] Unknown collection "${collectionName}" — returning [].`);
			return emptyList();
		}
		let qb = supabase.from(table).select('*');
		qb = filterToQuery(qb, opts.filter);
		const { column, ascending } = sortToOrder(opts.sort);
		qb = qb.order(column, { ascending, nullsFirst: false });
		const { data, error } = await qb;
		if (error) throw error;
		return data || [];
	}

	async function getList(page, perPage, opts = {}) {
		const items = await getFullList(opts);
		const start = (page - 1) * perPage;
		const slice = items.slice(start, start + perPage);
		return { items: slice, totalItems: items.length };
	}

	async function create(body, _opts) {
		if (!table) {
			console.warn(`[supabaseMappedCollections] create skipped for unknown collection "${collectionName}".`);
			return { id: crypto.randomUUID(), ...body };
		}
		const row = mapKeysToSnake(body);
		const { data, error } = await supabase.from(table).insert(row).select('*').single();
		if (error) throw error;
		return data;
	}

	async function update(id, body, _opts) {
		if (!table) throw new Error(`Unknown collection ${collectionName}`);
		const row = mapKeysToSnake(body);
		const { data, error } = await supabase.from(table).update(row).eq('id', id).select('*').single();
		if (error) throw error;
		return data;
	}

	async function removeById(id, _opts) {
		if (!table) throw new Error(`Unknown collection ${collectionName}`);
		const { error } = await supabase.from(table).delete().eq('id', id);
		if (error) throw error;
		return true;
	}

	return { getFullList, getList, create, update, delete: removeById };
}

const supabaseMappedCollections = {
	authStore: {
		clear() {
			void supabase.auth.signOut();
		},
	},
	collection(name) {
		return collectionApi(name);
	},
};

export default supabaseMappedCollections;

export { supabaseMappedCollections };
