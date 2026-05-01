import { Router } from 'express';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';
import { uploadFiles } from '../middleware/file-upload.js';
import {
	extractTextFromFile,
	getFileType,
	chunkText,
} from '../utils/fileExtractor.js';

const svc = () => getSupabaseAdmin();

async function kbGet(id) {
	const { data, error } = await svc().from('knowledge_base').select('*').eq('id', id).maybeSingle();
	if (error) throw error;
	if (!data) {
		const e = new Error('Not found');
		e.status = 404;
		throw e;
	}
	return { ...data, ...(data.metadata || {}) };
}

const router = Router();

/**
 * POST /knowledge-base/upload
 * Upload and process a file for knowledge base
 */
router.post('/upload', uploadFiles({
  maxCount: 1,
  maxSizeMB: 50,
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ],
  fieldName: 'file',
}), async (req, res) => {
  const { title, category, description } = req.body;

  // Validate required fields
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: 'Missing required field: file',
    });
  }

  if (!title) {
    return res.status(400).json({
      error: 'Missing required field: title',
    });
  }

  if (!category) {
    return res.status(400).json({
      error: 'Missing required field: category',
    });
  }

  const file = req.files[0];
  const fileType = getFileType(file.mimetype);

  if (fileType === 'unknown') {
    return res.status(400).json({
      error: `Unsupported file type: ${file.mimetype}`,
    });
  }

  try {
    // Extract text from file
    logger.info(`Extracting text from ${file.originalname}`);
    const extractedText = await extractTextFromFile(file.buffer, file.mimetype);

    if (!extractedText || extractedText.length === 0) {
      return res.status(400).json({
        error: 'No text could be extracted from the file',
      });
    }

    // Chunk text
    const chunks = chunkText(extractedText, 1000);

    // Create knowledge base record
    const docData = {
      title,
      category,
      description: description || '',
      content_type: fileType,
      file_name: file.originalname,
      file_size: file.size,
      original_text: extractedText.substring(0, 5000), // Store first 5000 chars as preview
      chunks_json: JSON.stringify(chunks),
      chunk_count: chunks.length,
      status: 'indexed',
      indexed: true,
      last_indexed_date: new Date().toISOString(),
      uploaded_at: new Date().toISOString(),
      version_history_json: JSON.stringify([
        {
          version: 1,
          uploaded_at: new Date().toISOString(),
          file_name: file.originalname,
          file_size: file.size,
          chunk_count: chunks.length,
        },
      ]),
    };

    const { data: document, error: insErr } = await svc()
      .from('knowledge_base')
      .insert({
        title,
        category,
        status: 'indexed',
        content: (docData.original_text || '').toString(),
        metadata: docData,
        description: docData.description || '',
        content_type: docData.content_type,
        file_name: docData.file_name,
        file_size: docData.file_size,
        original_text: docData.original_text,
        chunks_json: docData.chunks_json,
        chunk_count: docData.chunk_count,
        indexed: true,
        last_indexed_date: docData.last_indexed_date,
        uploaded_at: docData.uploaded_at,
        version_history_json: docData.version_history_json,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    logger.info(`Knowledge base document created: ${document.id} with ${chunks.length} chunks`);

    res.status(201).json({
      id: document.id,
      title: document.title,
      category: document.category,
      content_type: docData.content_type,
      chunk_count: docData.chunk_count,
      status: document.status,
      uploaded_at: document.created_at,
    });
  } catch (error) {
    logger.error(`Error processing file: ${error.message}`);
    throw new Error(`Failed to process file: ${error.message}`);
  }
});

/**
 * GET /knowledge-base
 * List documents with pagination and filtering
 */
router.get('/', async (req, res) => {
  const { page, limit, content_type, status, search, category } = req.query;

  const pageNum = parseInt(page) || 1;
  const pageLimit = Math.min(parseInt(limit) || 10, 100);

	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;
	let q = svc().from('knowledge_base').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
	if (status) q = q.eq('status', status);
	if (category) q = q.eq('category', category);
	if (content_type) q = q.eq('content_type', content_type);
	if (search) q = q.or(`title.ilike.%${String(search).replace(/%/g, '')}%,description.ilike.%${String(search).replace(/%/g, '')}%`);
	const { data: rows, error, count } = await q;
	if (error) throw error;
	const total = count ?? 0;
	const items = (rows || []).map((doc) => ({ ...doc, ...(doc.metadata || {}) }));

	logger.info(`Fetched ${items.length} knowledge base documents (page ${pageNum})`);

	res.json({
		items: items.map((doc) => ({
			id: doc.id,
			title: doc.title,
			category: doc.category,
			description: doc.description,
			content_type: doc.content_type,
			chunk_count: doc.chunk_count,
			status: doc.status,
			uploaded_at: doc.uploaded_at || doc.created_at,
			last_indexed_date: doc.last_indexed_date,
		})),
		page: pageNum,
		perPage: pageLimit,
		totalItems: total,
		totalPages: Math.max(1, Math.ceil(total / pageLimit)),
	});
});

/**
 * GET /knowledge-base/search
 * Full-text search across documents
 */
router.get('/search', async (req, res) => {
	const { q } = req.query;
	if (!q || q.length === 0) {
		return res.status(400).json({ error: 'Missing required query parameter: q' });
	}
	const searchTerm = q.toLowerCase();
	const { data: documents, error } = await svc().from('knowledge_base').select('*').eq('status', 'indexed').limit(2000);
	if (error) throw error;
	const results = [];
	for (const doc of documents || []) {
		const row = { ...doc, ...(doc.metadata || {}) };
		let relevanceScore = 0;
		let matchingSnippet = '';
		if (row.title && row.title.toLowerCase().includes(searchTerm)) {
			relevanceScore += 50;
			matchingSnippet = row.title;
		}
		if (row.description && row.description.toLowerCase().includes(searchTerm)) {
			relevanceScore += 30;
			if (!matchingSnippet) matchingSnippet = row.description.substring(0, 100);
		}
		let chunks = [];
		try {
			chunks = JSON.parse(row.chunks_json || '[]');
		} catch {
			logger.warn(`Failed to parse chunks for document ${row.id}`);
		}
		for (const chunk of chunks) {
			if (String(chunk).toLowerCase().includes(searchTerm)) {
				relevanceScore += 20;
				if (!matchingSnippet) {
					const index = String(chunk).toLowerCase().indexOf(searchTerm);
					const start = Math.max(0, index - 50);
					const end = Math.min(String(chunk).length, index + searchTerm.length + 50);
					matchingSnippet = String(chunk).substring(start, end);
				}
			}
		}
		if (relevanceScore > 0) {
			results.push({
				document_id: row.id,
				title: row.title,
				matching_snippet: matchingSnippet,
				relevance_score: Math.min(100, relevanceScore),
				content_type: row.content_type,
				uploaded_at: row.uploaded_at || row.created_at,
			});
		}
	}
	results.sort((a, b) => b.relevance_score - a.relevance_score);
	res.json({ query: q, results, count: results.length });
});

/**
 * GET /knowledge-base/analytics
 */
router.get('/analytics', async (req, res) => {
	const { data: documents, error } = await svc().from('knowledge_base').select('*').limit(5000);
	if (error) throw error;
	const docs = documents || [];
	const totalFileSize = docs.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
	const byContentType = {};
	docs.forEach((doc) => {
		const type = doc.content_type || 'unknown';
		byContentType[type] = (byContentType[type] || 0) + 1;
	});
	const uploadTrend = {};
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	docs.forEach((doc) => {
		const uploadDate = new Date(doc.uploaded_at || doc.created_at);
		if (uploadDate >= thirtyDaysAgo) {
			const dateStr = uploadDate.toISOString().split('T')[0];
			uploadTrend[dateStr] = (uploadTrend[dateStr] || 0) + 1;
		}
	});
	const uploadTrendArray = Object.entries(uploadTrend)
		.map(([date, count]) => ({ date, count }))
		.sort((a, b) => new Date(a.date) - new Date(b.date));
	const mostReferenced = docs
		.sort((a, b) => (b.chunk_count || 0) - (a.chunk_count || 0))
		.slice(0, 10)
		.map((doc) => ({ title: doc.title, chunk_count: doc.chunk_count }));
	const indexingStatus = {
		indexed: docs.filter((d) => d.status === 'indexed').length,
		pending: docs.filter((d) => d.status === 'pending').length,
		failed: docs.filter((d) => d.status === 'failed').length,
	};
	res.json({
		total_documents: docs.length,
		total_file_size_bytes: totalFileSize,
		total_file_size_mb: (totalFileSize / (1024 * 1024)).toFixed(2),
		by_content_type: byContentType,
		upload_trend: uploadTrendArray,
		most_referenced_documents: mostReferenced,
		indexing_status: indexingStatus,
	});
});

/**
 * GET /knowledge-base/:docId
 * Retrieve single document with chunks
 */
router.get('/:docId', async (req, res) => {
  const { docId } = req.params;

  const document = await kbGet(docId);

  // Parse chunks JSON
  let chunks = [];
  try {
    chunks = JSON.parse(document.chunks_json || '[]');
  } catch (error) {
    logger.warn(`Failed to parse chunks for document ${docId}`);
  }

  logger.info(`Fetched knowledge base document: ${docId}`);

  res.json({
    id: document.id,
    title: document.title,
    category: document.category,
    description: document.description,
    content_type: document.content_type,
    file_name: document.file_name,
    file_size: document.file_size,
    chunk_count: document.chunk_count,
    status: document.status,
    indexed: document.indexed,
    uploaded_at: document.uploaded_at,
    last_indexed_date: document.last_indexed_date,
    chunks,
  });
});

/**
 * PUT /knowledge-base/:docId
 * Update document details
 */
router.put('/:docId', async (req, res) => {
  const { docId } = req.params;
  const { title, category, description, status, indexed } = req.body;

  const updateData = {};

  if (title) updateData.title = title;
  if (category) updateData.category = category;
  if (description) updateData.description = description;
  if (status) updateData.status = status;
  if (indexed !== undefined) updateData.indexed = indexed;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      error: 'No fields to update',
    });
  }

  updateData.updated_at = new Date().toISOString();

  const { data: updatedDocument, error: upe } = await svc().from('knowledge_base').update(updateData).eq('id', docId).select().single();
  if (upe) throw upe;

  logger.info(`Knowledge base document updated: ${docId}`);

  res.json({
    id: updatedDocument.id,
    title: updatedDocument.title,
    category: updatedDocument.category,
    description: updatedDocument.description,
    status: updatedDocument.status,
    indexed: updatedDocument.indexed,
  });
});

/**
 * DELETE /knowledge-base/:docId
 * Delete document
 */
router.delete('/:docId', async (req, res) => {
  const { docId } = req.params;

  const document = await kbGet(docId);

  await svc().from('knowledge_base').delete().eq('id', docId);

  logger.info(`Knowledge base document deleted: ${docId}`);

  res.json({
    success: true,
    message: 'Document deleted successfully',
    title: document.title,
  });
});

/**
 * POST /knowledge-base/:docId/reindex
 * Re-index document
 */
router.post('/:docId/reindex', async (req, res) => {
  const { docId } = req.params;

  const document = await kbGet(docId);

  // For MVP, we'll re-chunk the existing text
  // In production, you'd fetch the original file from storage
  let originalText = document.original_text || '';

  if (!originalText) {
    return res.status(400).json({
      error: 'Original text not available for re-indexing',
    });
  }

  // Re-chunk text
  const chunks = chunkText(originalText, 1000);

  // Update document
  const updateData = {
    chunks_json: JSON.stringify(chunks),
    chunk_count: chunks.length,
    status: 'indexed',
    indexed: true,
    last_indexed_date: new Date().toISOString(),
  };

  const { data: updatedDocument, error: upe } = await svc().from('knowledge_base').update(updateData).eq('id', docId).select().single();
  if (upe) throw upe;

  logger.info(`Knowledge base document re-indexed: ${docId} with ${chunks.length} chunks`);

  res.json({
    success: true,
    message: 'Document re-indexed successfully',
    chunk_count: chunks.length,
    last_indexed_date: updatedDocument.last_indexed_date,
  });
});

/**
 * POST /knowledge-base/:docId/versions
 * Upload new version of document
 */
router.post('/:docId/versions', uploadFiles({
  maxCount: 1,
  maxSizeMB: 50,
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ],
  fieldName: 'file',
}), async (req, res) => {
  const { docId } = req.params;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: 'Missing required field: file',
    });
  }

  const file = req.files[0];
  const fileType = getFileType(file.mimetype);

  if (fileType === 'unknown') {
    return res.status(400).json({
      error: `Unsupported file type: ${file.mimetype}`,
    });
  }

  try {
    // Fetch existing document
    const document = await kbGet(docId);

    // Extract text from new file
    logger.info(`Extracting text from new version: ${file.originalname}`);
    const extractedText = await extractTextFromFile(file.buffer, file.mimetype);

    if (!extractedText || extractedText.length === 0) {
      return res.status(400).json({
        error: 'No text could be extracted from the file',
      });
    }

    // Chunk text
    const chunks = chunkText(extractedText, 1000);

    // Parse existing version history
    let versionHistory = [];
    try {
      versionHistory = JSON.parse(document.version_history_json || '[]');
    } catch (error) {
      logger.warn(`Failed to parse version history for document ${docId}`);
    }

    // Add new version
    const newVersion = {
      version: versionHistory.length + 1,
      uploaded_at: new Date().toISOString(),
      file_name: file.originalname,
      file_size: file.size,
      chunk_count: chunks.length,
    };
    versionHistory.push(newVersion);

    // Update document
    const updateData = {
      content_type: fileType,
      file_name: file.originalname,
      file_size: file.size,
      original_text: extractedText.substring(0, 5000),
      chunks_json: JSON.stringify(chunks),
      chunk_count: chunks.length,
      status: 'indexed',
      indexed: true,
      last_indexed_date: new Date().toISOString(),
      version_history_json: JSON.stringify(versionHistory),
    };

    const { data: updatedDocument, error: upe } = await svc().from('knowledge_base').update(updateData).eq('id', docId).select().single();
  if (upe) throw upe;

    logger.info(`New version uploaded for document ${docId}: version ${newVersion.version}`);

    res.json({
      id: updatedDocument.id,
      title: updatedDocument.title,
      version: newVersion.version,
      chunk_count: chunks.length,
      uploaded_at: newVersion.uploaded_at,
      version_history: versionHistory,
    });
  } catch (error) {
    logger.error(`Error uploading new version: ${error.message}`);
    throw new Error(`Failed to upload new version: ${error.message}`);
  }
});

/**
 * POST /knowledge-base/:docId/chunks
 * Manage chunks (edit, delete, merge, split)
 */
router.post('/:docId/chunks', async (req, res) => {
  const { docId } = req.params;
  const { action, chunk_ids, new_content } = req.body;

  if (!action) {
    return res.status(400).json({
      error: 'Missing required field: action (edit, delete, merge, split)',
    });
  }

  const validActions = ['edit', 'delete', 'merge', 'split'];
  if (!validActions.includes(action)) {
    return res.status(400).json({
      error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
    });
  }

  // Fetch document
  const document = await kbGet(docId);

  // Parse chunks
  let chunks = [];
  try {
    chunks = JSON.parse(document.chunks_json || '[]');
  } catch (error) {
    return res.status(400).json({
      error: 'Failed to parse document chunks',
    });
  }

  // Perform action
  if (action === 'edit') {
    if (!chunk_ids || chunk_ids.length === 0) {
      return res.status(400).json({
        error: 'Missing required field: chunk_ids',
      });
    }

    if (!new_content) {
      return res.status(400).json({
        error: 'Missing required field: new_content',
      });
    }

    // Edit first chunk in chunk_ids
    const chunkIndex = chunks.findIndex((c) => c === chunks[chunk_ids[0]]);
    if (chunkIndex !== -1) {
      chunks[chunkIndex] = new_content;
    }
  } else if (action === 'delete') {
    if (!chunk_ids || chunk_ids.length === 0) {
      return res.status(400).json({
        error: 'Missing required field: chunk_ids',
      });
    }

    // Delete chunks by index
    chunks = chunks.filter((_, index) => !chunk_ids.includes(index));
  } else if (action === 'merge') {
    if (!chunk_ids || chunk_ids.length < 2) {
      return res.status(400).json({
        error: 'merge action requires at least 2 chunk_ids',
      });
    }

    // Merge chunks
    const chunksToMerge = chunk_ids.map((id) => chunks[id]).filter((c) => c);
    const mergedContent = chunksToMerge.join(' ');

    // Remove old chunks and add merged one
    chunks = chunks.filter((_, index) => !chunk_ids.includes(index));
    chunks.push(mergedContent);
  } else if (action === 'split') {
    if (!chunk_ids || chunk_ids.length === 0) {
      return res.status(400).json({
        error: 'Missing required field: chunk_ids',
      });
    }

    // Split chunk at index
    const chunkIndex = chunk_ids[0];
    const chunkToSplit = chunks[chunkIndex];

    if (!chunkToSplit) {
      return res.status(400).json({
        error: 'Chunk not found',
      });
    }

    // Split at middle
    const midpoint = Math.floor(chunkToSplit.length / 2);
    const part1 = chunkToSplit.substring(0, midpoint);
    const part2 = chunkToSplit.substring(midpoint);

    chunks[chunkIndex] = part1;
    chunks.splice(chunkIndex + 1, 0, part2);
  }

  // Update document
  const updateData = {
    chunks_json: JSON.stringify(chunks),
    chunk_count: chunks.length,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedDocument, error: upe } = await svc().from('knowledge_base').update(updateData).eq('id', docId).select().single();
  if (upe) throw upe;

  logger.info(`Document chunks updated: ${docId} - action: ${action}`);

  res.json({
    success: true,
    message: `Chunks ${action}ed successfully`,
    chunk_count: chunks.length,
    chunks,
  });
});

export default router;
