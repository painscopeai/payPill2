import type { SupabaseClient } from '@supabase/supabase-js';

export type PurgeError = Error & { statusCode?: number };

/**
 * Remove all vector chunks for an upload ID.
 * Covers: column uploaded_file_id, and metadata variants from LangChain / n8n (uploadedFileID, etc.).
 */
async function deleteDocumentsForUpload(sb: SupabaseClient, uploadId: string): Promise<void> {
	const attempts = [
		() => sb.from('documents').delete().eq('uploaded_file_id', uploadId),
		() => sb.from('documents').delete().filter('metadata->>uploadedFileID', 'eq', uploadId),
		() => sb.from('documents').delete().filter('metadata->>uploaded_file_id', 'eq', uploadId),
		() => sb.from('documents').delete().filter('metadata->>uploadedFileId', 'eq', uploadId),
	];

	for (const run of attempts) {
		const { error } = await run();
		if (error) {
			console.warn('[purgeUploadedFileAdmin] documents.delete:', error.message);
		}
	}
}

/**
 * Remove linked knowledge_base rows (column FK or legacy metadata JSON).
 */
async function deleteKnowledgeBaseForUpload(sb: SupabaseClient, uploadId: string): Promise<void> {
	const kbRes = await sb.from('knowledge_base').delete().eq('uploaded_file_id', uploadId);
	if (kbRes.error) {
		console.warn('[purgeUploadedFileAdmin] knowledge_base.delete column:', kbRes.error.message);
	}
	const metaAttempts = [
		() => sb.from('knowledge_base').delete().filter('metadata->>uploaded_file_id', 'eq', uploadId),
		() => sb.from('knowledge_base').delete().filter('metadata->>uploadedFileId', 'eq', uploadId),
		() => sb.from('knowledge_base').delete().filter('metadata->>uploadedFileID', 'eq', uploadId),
	];
	for (const run of metaAttempts) {
		const { error } = await run();
		if (error) {
			console.warn('[purgeUploadedFileAdmin] knowledge_base.delete metadata:', error.message);
		}
	}
}

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

	await deleteDocumentsForUpload(sb, uploadedFileId);
	await deleteKnowledgeBaseForUpload(sb, uploadedFileId);

	if (row.bucket && row.path) {
		const { error: storageErr } = await sb.storage.from(row.bucket).remove([row.path]);
		if (storageErr) {
			// Continue — DB cleanup still needed; object may already be gone
			console.warn('[purgeUploadedFileAdmin] storage remove:', storageErr.message);
		}
	}

	// Any remaining FK-linked rows CASCADE; orphaned chunks already removed above.
	const { error: delErr } = await sb.from('uploaded_files').delete().eq('id', uploadedFileId);
	if (delErr) {
		const e = new Error(delErr.message) as PurgeError;
		e.statusCode = 500;
		throw e;
	}
}
