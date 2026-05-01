/**
 * PocketBase was removed from the stack. This module remains as a no-op stub so
 * any accidental import cannot crash the Node process (previously: eager health
 * check + process.exit(1)). All data access must use Supabase via getSupabaseAdmin().
 */
import logger from './logger.js';

function warnStub(method) {
	logger.warn(
		`[pocketbaseClient] Stub invoked (${method}). PocketBase is retired — migrate this call to Supabase.`,
	);
}

/** @returns {never} */
function rejectRetired() {
	return Promise.reject(
		new Error('PocketBase has been removed from this application. Use Supabase instead.'),
	);
}

const stub = {
	collection() {
		return {
			getFullList: () => rejectRetired(),
			getList: () => rejectRetired(),
			getOne: () => rejectRetired(),
			getFirstListItem: () => rejectRetired(),
			create: () => rejectRetired(),
			update: () => rejectRetired(),
			delete: () => rejectRetired(),
			authWithPassword: () => rejectRetired(),
			authRefresh: () => rejectRetired(),
		};
	},
	createBatch: () => ({
		send: () => rejectRetired(),
	}),
	filter: () => '',
	authStore: {
		isValid: false,
		token: '',
		save: () => warnStub('authStore.save'),
	},
	beforeSend: undefined,
	autoCancellation: () => {},
};

export default stub;
export { stub as pocketbaseClient };
