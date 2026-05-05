# n8n knowledge-base pipeline (PayPill)

## Webhook fields sent by the app

`POST` from [`apps/web/src/app/api/admin/knowledge-base/document/route.ts`](../../apps/web/src/app/api/admin/knowledge-base/document/route.ts) accepts **PDF only** (`.pdf` + valid `%PDF-` header); includes:

- Binary `file` part(s) — same bytes stored in Supabase Storage under `uploads/{adminId}/…`
- `source`, `adminId`, `uploadedAt`
- `uploadedFiles` — JSON array: `{ id, storagePath, fileName, size, mimeType, checksum }[]`
- `uploadedFileId` — first file’s `uploaded_files.id` (same as `uploadedFiles[0].id`)
- `checksum` — SHA-256 hex for first file
- `knowledgeBaseId` — optional; empty string if not passed from client

## Wiring IDs through chunks

1. After **Extract From File** / **Switch**, add a **Code** node using [`documents-code-node.js`](./documents-code-node.js) **or** merge webhook JSON into the branch so `uploadedFileId` / `uploadedFiles` stay on `item.json`.
2. **Default Data Loader** — enable splitting as needed. Under **Options → Metadata**, add properties so every chunk carries:
   - `uploaded_file_id` → `{{ $json.uploaded_file_id }}`
   - `knowledge_base_id` → `{{ $json.knowledge_base_id }}`
   - `chunk_index` → `{{ $json.chunk_index }}`
   - optionally `file_name`, `source`
3. Run **Code** again **after** the loader if `chunk_index` must be `0..n-1` per chunk (use index expression `{{ $itemIndex }}` in a Set node or extend `documents-code-node.js`).
4. **Embeddings OpenAI** (`text-embedding-3-small`, 1536 dims) → **Supabase Vector Store** (Insert Documents, table `documents`).
5. Ensure each inserted row stores `uploaded_file_id` (column) and/or inside `metadata` jsonb so deletes cascade correctly.

## Delete behavior (app)

Admin UI calls `DELETE /api/admin/knowledge-base/:uploadedFileId`, which deletes all `documents` rows for that upload (`uploaded_file_id` column **or** `metadata.uploadedFileID` / snake_case variants), clears linked `knowledge_base` rows when present, removes the Storage object, then deletes the `uploaded_files` row.

## Dedupe / replace

Re-uploading the **same file bytes** (same SHA-256) triggers removal of the previous `uploaded_files` row before inserting a new one — avoids duplicate chunks for identical content.

## Verification checklist

1. Run migration `20260521120000_document_lifecycle.sql` in Supabase SQL editor.
2. Upload a PDF from Admin KB → Table Editor: `uploaded_files.checksum_sha256` populated; `documents` rows have `uploaded_file_id` matching after n8n completes (confirm metadata wiring).
3. Delete from Admin KB UI → `documents` rows for that `uploaded_file_id` gone; Storage object removed.
4. Upload the same file again → API JSON shows `"replaced": true`; old chunks gone.
