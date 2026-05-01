import { App } from '@tinyhttp/app';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';
import { checkPermission, attachAuditLog } from '../middleware/rbac.js';

const router = new App();
router.use(attachAuditLog);
const sb = () => getSupabaseAdmin();

router.get('/knowledge-base', checkPermission('manage_ai'), async (req, res) => {
	const { search, category, status, page, limit } = req.query;
	const pageNum = parseInt(page, 10) || 1;
	const pageLimit = Math.min(parseInt(limit, 10) || 50, 500);
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;
	let q = sb().from('knowledge_base').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
	if (category) q = q.eq('category', category);
	if (status) q = q.eq('status', status);
	if (search) {
		const s = String(search).replace(/%/g, '');
		q = q.or(`title.ilike.%${s}%,content.ilike.%${s}%`);
	}
	const { data, error, count } = await q;
	if (error) throw error;
	const total = count ?? 0;
	res.json({
		items: data || [],
		page: pageNum,
		perPage: pageLimit,
		totalItems: total,
		totalPages: Math.max(1, Math.ceil(total / pageLimit)),
	});
});

router.post('/knowledge-base', checkPermission('manage_ai'), async (req, res) => {
	const { title, content, category, source_type, status } = req.body;
	if (!title || !content || !category) {
		return res.status(400).json({ error: 'Missing required fields: title, content, category' });
	}
	const entryData = {
		title,
		content,
		category,
		status: status || 'active',
		metadata: { source_type: source_type || 'manual', created_by: req.adminId },
	};
	const { data: entry, error } = await sb().from('knowledge_base').insert(entryData).select().single();
	if (error) throw error;
	await req.auditLog('CREATE_KB_ENTRY', 'knowledge_base', entry.id, entryData);
	res.status(201).json({ success: true, entry });
});

router.patch('/knowledge-base/:id', checkPermission('manage_ai'), async (req, res) => {
	const { id } = req.params;
	const { title, content, category, status } = req.body;
	const updateData = {};
	if (title) updateData.title = title;
	if (content) updateData.content = content;
	if (category) updateData.category = category;
	if (status) updateData.status = status;
	const { data, error } = await sb().from('knowledge_base').update(updateData).eq('id', id).select().single();
	if (error) throw error;
	await req.auditLog('UPDATE_KB_ENTRY', 'knowledge_base', id, updateData);
	res.json({ success: true, entry: data });
});

router.delete('/knowledge-base/:id', checkPermission('manage_ai'), async (req, res) => {
	const { id } = req.params;
	if (req.query.archive === 'true') {
		const { error } = await sb().from('knowledge_base').update({ status: 'archived' }).eq('id', id);
		if (error) throw error;
		await req.auditLog('ARCHIVE_KB_ENTRY', 'knowledge_base', id);
		return res.json({ success: true, message: 'Knowledge base entry archived successfully' });
	}
	const { error } = await sb().from('knowledge_base').delete().eq('id', id);
	if (error) throw error;
	await req.auditLog('DELETE_KB_ENTRY', 'knowledge_base', id);
	res.json({ success: true, message: 'Knowledge base entry deleted successfully' });
});

router.get('/logs', checkPermission('manage_ai'), async (req, res) => {
	const { user_id, status, start_date, end_date, page, limit } = req.query;
	const pageNum = parseInt(page, 10) || 1;
	const pageLimit = Math.min(parseInt(limit, 10) || 50, 500);
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;
	let q = sb().from('ai_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
	if (user_id) q = q.eq('user_id', user_id);
	if (status) q = q.eq('status', status);
	if (start_date) q = q.gte('created_at', start_date);
	if (end_date) q = q.lte('created_at', end_date);
	const { data, error, count } = await q;
	if (error) throw error;
	const total = count ?? 0;
	res.json({
		items: data || [],
		page: pageNum,
		perPage: pageLimit,
		totalItems: total,
		totalPages: Math.max(1, Math.ceil(total / pageLimit)),
	});
});

router.get('/insights', checkPermission('manage_ai'), async (req, res) => {
	const pageLimit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
	let q = sb().from('ai_insights').select('*').order('created_at', { ascending: false }).limit(pageLimit);
	const { data, error } = await q;
	if (error) throw error;
	res.json({ items: data || [], count: (data || []).length });
});

router.get('/analytics', checkPermission('manage_ai'), async (req, res) => {
	const { data: logs, error } = await sb().from('ai_logs').select('*').limit(5000);
	if (error) throw error;
	const list = logs || [];
	const analytics = {
		total_requests: list.length,
		successful: list.filter((l) => l.status === 'success').length,
		failed: list.filter((l) => l.status === 'failed').length,
		average_response_time_ms: 0,
		by_action: {},
	};
	if (list.length > 0) {
		const totalTime = list.reduce((sum, l) => sum + (l.response_time_ms || l.processing_time_ms || 0), 0);
		analytics.average_response_time_ms = Math.round(totalTime / list.length);
	}
	res.json(analytics);
});

export default router;
