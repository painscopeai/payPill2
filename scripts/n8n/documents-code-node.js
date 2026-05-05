/**
 * n8n Code node — run AFTER text extraction / BEFORE or AFTER Default Data Loader splitting.
 *
 * For EACH chunk item (one row per output item), exposes IDs so Supabase `documents` rows stay traceable:
 * - uploaded_file_id (canonical upload id from PayPill proxy / webhook form field `uploadedFileId`)
 * - knowledge_base_id (optional; form field `knowledgeBaseId`)
 * - chunk_index (per-item index when this Code runs after the loader split)
 * - user_id (adminId from webhook)
 *
 * Map these in Default Data Loader → Options → Metadata, and/or pass through to Supabase Vector Store.
 */

const items = $input.all();

function pickUploadedId(j) {
	return (
		j.uploadedFileId ||
		j.uploaded_file_id ||
		j.body?.uploadedFileId ||
		(Array.isArray(j.uploadedFiles) && j.uploadedFiles[0]?.id) ||
		null
	);
}

function pickKbId(j) {
	const raw = j.knowledgeBaseId ?? j.knowledge_base_id ?? '';
	const s = typeof raw === 'string' ? raw.trim() : String(raw || '').trim();
	return s || null;
}

function pickUserId(j) {
	return j.adminId || j.userId || j.user_id || null;
}

function pickText(j) {
	const candidates = [
		j.pageContent,
		j.text,
		j.content,
		j.data,
		j.extractedText,
		j.result,
		j.body,
		j.document?.pageContent,
		j.document?.text,
	];
	for (const v of candidates) {
		if (v === undefined || v === null) continue;
		const s = typeof v === 'string' ? v : JSON.stringify(v);
		if (s.trim()) return s.trim();
	}
	return '';
}

return items.map((item, chunk_index) => {
	const j = item.json || {};
	const uploaded_file_id = pickUploadedId(j);
	const knowledge_base_id = pickKbId(j);
	const user_id = pickUserId(j);
	const text = pickText(j);

	return {
		json: {
			pageContent: text,
			text,
			content: text,
			uploaded_file_id,
			knowledge_base_id,
			user_id,
			chunk_index,
			metadata: {
				...(typeof j.metadata === 'object' && j.metadata !== null ? j.metadata : {}),
				uploaded_file_id,
				knowledge_base_id,
				user_id,
				chunk_index,
				source: j.source || 'paypill-admin',
				file_name:
					j.fileName ||
					j.file_name ||
					(Array.isArray(j.uploadedFiles) && j.uploadedFiles[0]?.fileName) ||
					null,
			},
		},
	};
});
