import type { SupabaseClient } from '@supabase/supabase-js';

export type PurgeError = Error & { statusCode?: number };

/**
 * Remove storage object and uploaded_files row (cascades documents + knowledge_base when FK set).
 * Restricted to source = admin_kb for safety.
 */
export async function purgeUploadedFileAdmin(sb: SupabaseClient, uploadedFileId: string): Promise<void> {
	const { data: row, error: fetchErr } = await sb
		.from('uploaded_files')
		.select('id, bucket, path, source')
		.eq('id', uploadedFileId)
		.maybeSingle();

	if (fetchErr) {
		const e = new Error(fetchErr.message) as PurgeError;
		e.statusCode = 500;
		throw e;
	}
	if (!row) {
		const e = new Error('Upload not found') as PurgeError;
		e.statusCode = 404;
		throw e;
	}
	if (row.source !== 'admin_kb') {
		const e = new Error('Cannot delete this upload type') as PurgeError;
		e.statusCode = 403;
		throw e;
	}

	if (row.bucket && row.path) {
		const { error: storageErr } = await sb.storage.from(row.bucket).remove([row.path]);
		if (storageErr) {
			// Continue — DB cleanup still needed; object may already be gone
			console.warn('[purgeUploadedFileAdmin] storage remove:', storageErr.message);
		}
	}

	// Cascades to documents chunks + knowledge_base when FK columns reference this upload
	const { error: delErr } = await sb.from('uploaded_files').delete().eq('id', uploadedFileId);
	if (delErr) {
		const e = new Error(delErr.message) as PurgeError;
		e.statusCode = 500;
		throw e;
	}
}
