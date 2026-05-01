import { Router } from 'express';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';
import { checkPermission, attachAuditLog, HttpError } from '../middleware/rbac.js';

const router = Router();
router.use(attachAuditLog);
const sb = () => getSupabaseAdmin();

router.get('/', checkPermission('manage_forms'), async (req, res) => {
	const { status, category, search, page, limit } = req.query;
	const pageNum = parseInt(page, 10) || 1;
	const pageLimit = Math.min(parseInt(limit, 10) || 50, 500);
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;
	let q = sb().from('forms').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
	if (status) q = q.eq('status', status);
	if (category) q = q.eq('category', category);
	if (search) {
		const s = String(search).replace(/%/g, '');
		q = q.or(`name.ilike.%${s}%,title.ilike.%${s}%,description.ilike.%${s}%`);
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

router.post('/', checkPermission('manage_forms'), async (req, res) => {
	const { title, description, category, status } = req.body;
	if (!title || !category) return res.status(400).json({ error: 'Missing required fields: title, category' });
	const formData = {
		name: title,
		title,
		form_type: category,
		category,
		description: description || '',
		status: status || 'draft',
		created_by: req.adminId,
	};
	const { data: form, error } = await sb().from('forms').insert(formData).select().single();
	if (error) throw error;
	await req.auditLog('CREATE_FORM', 'form', form.id, formData);
	res.status(201).json({ success: true, form });
});

router.patch('/:id', checkPermission('manage_forms'), async (req, res) => {
	const { id } = req.params;
	const { title, description, category, status } = req.body;
	const updateData = {};
	if (title) {
		updateData.title = title;
		updateData.name = title;
	}
	if (description !== undefined) updateData.description = description;
	if (category) {
		updateData.category = category;
		updateData.form_type = category;
	}
	if (status) updateData.status = status;
	const { data, error } = await sb().from('forms').update(updateData).eq('id', id).select().single();
	if (error) throw error;
	await req.auditLog('UPDATE_FORM', 'form', id, updateData);
	res.json({ success: true, form: data });
});

router.delete('/:id', checkPermission('manage_forms'), async (req, res) => {
	const { id } = req.params;
	if (req.query.confirm !== 'true') return res.status(400).json({ error: 'Deletion must be confirmed with ?confirm=true' });
	const { data: form } = await sb().from('forms').select('name,title').eq('id', id).maybeSingle();
	await sb().from('form_questions').delete().eq('form_id', id);
	await sb().from('form_responses').delete().eq('form_id', id);
	const { error } = await sb().from('forms').delete().eq('id', id);
	if (error) throw error;
	await req.auditLog('DELETE_FORM', 'form', id, { title: form?.title || form?.name });
	res.json({ success: true, message: 'Form deleted successfully' });
});

router.get('/:id/questions', checkPermission('manage_forms'), async (req, res) => {
	const { id } = req.params;
	const { page, limit } = req.query;
	const pageNum = parseInt(page, 10) || 1;
	const pageLimit = Math.min(parseInt(limit, 10) || 100, 500);
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;
	const { data, error, count } = await sb()
		.from('form_questions')
		.select('*', { count: 'exact' })
		.eq('form_id', id)
		.order('sort_order', { ascending: true })
		.range(from, to);
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

router.post('/:id/questions', checkPermission('manage_forms'), async (req, res) => {
	const { id } = req.params;
	const { question_text, question_type, options, required, order } = req.body;
	if (!question_text || !question_type) {
		return res.status(400).json({ error: 'Missing required fields: question_text, question_type' });
	}
	const questionData = {
		form_id: id,
		question_text,
		question_type,
		options: options || [],
		required: required !== false,
		sort_order: order ?? 0,
	};
	const { data: question, error } = await sb().from('form_questions').insert(questionData).select().single();
	if (error) throw error;
	await req.auditLog('CREATE_QUESTION', 'form_question', question.id, questionData);
	res.status(201).json({ success: true, question });
});

router.patch('/:formId/questions/:questionId', checkPermission('manage_forms'), async (req, res) => {
	const { questionId } = req.params;
	const { question_text, question_type, options, required, order } = req.body;
	const updateData = {};
	if (question_text) updateData.question_text = question_text;
	if (question_type) updateData.question_type = question_type;
	if (options) updateData.options = options;
	if (required !== undefined) updateData.required = required;
	if (order !== undefined) updateData.sort_order = order;
	const { data, error } = await sb().from('form_questions').update(updateData).eq('id', questionId).select().single();
	if (error) throw error;
	await req.auditLog('UPDATE_QUESTION', 'form_question', questionId, updateData);
	res.json({ success: true, question: data });
});

router.delete('/:formId/questions/:questionId', checkPermission('manage_forms'), async (req, res) => {
	const { questionId } = req.params;
	const { error } = await sb().from('form_questions').delete().eq('id', questionId);
	if (error) throw error;
	await req.auditLog('DELETE_QUESTION', 'form_question', questionId);
	res.json({ success: true, message: 'Question deleted successfully' });
});

router.get('/:id/responses', checkPermission('manage_forms'), async (req, res) => {
	const { id } = req.params;
	const { page, limit } = req.query;
	const pageNum = parseInt(page, 10) || 1;
	const pageLimit = Math.min(parseInt(limit, 10) || 50, 500);
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;
	const { data, error, count } = await sb()
		.from('form_responses')
		.select('*', { count: 'exact' })
		.eq('form_id', id)
		.order('created_at', { ascending: false })
		.range(from, to);
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

router.post('/:id/publish', checkPermission('manage_forms'), async (req, res) => {
	const { id } = req.params;
	const { data: form, error: fe } = await sb().from('forms').select('status').eq('id', id).maybeSingle();
	if (fe) throw fe;
	if (!form) return res.status(404).json({ error: 'Not found' });
	if (form.status === 'published') throw new HttpError(400, 'Form is already published');
	const { data, error } = await sb()
		.from('forms')
		.update({ status: 'published', published_at: new Date().toISOString(), published_by: req.adminId })
		.eq('id', id)
		.select()
		.single();
	if (error) throw error;
	await req.auditLog('PUBLISH_FORM', 'form', id);
	res.json({ success: true, form: data });
});

router.get('/:id/analytics', checkPermission('manage_forms'), async (req, res) => {
	const { id } = req.params;
	const { data: responses, error } = await sb().from('form_responses').select('*').eq('form_id', id);
	if (error) throw error;
	const list = responses || [];
	const analytics = {
		total_responses: list.length,
		completion_rate: list.length ? list.filter((r) => r.completed).length / list.length : 0,
		average_time_minutes: 0,
	};
	if (list.length > 0) {
		const totalTime = list.reduce((sum, r) => sum + (r.time_spent_seconds || r.completion_time_seconds || 0), 0);
		analytics.average_time_minutes = Math.round(totalTime / list.length / 60);
	}
	res.json(analytics);
});

export default router;
