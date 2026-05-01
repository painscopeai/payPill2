import { Router } from 'express';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';
import { checkPermission, attachAuditLog } from '../middleware/rbac.js';

const router = Router();

router.use(attachAuditLog);

const sb = () => getSupabaseAdmin();

function mapProfileRow(p) {
	if (!p) return p;
	return {
		...p,
		created: p.created_at,
		status: p.status || 'active',
		company_name: p.company_name || p.name,
	};
}

async function listProfiles(role, { page, limit, search }) {
	const pageNum = Math.max(1, parseInt(page, 10) || 1);
	const pageLimit = Math.min(parseInt(limit, 10) || 50, 500);
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;
	let q = sb().from('profiles').select('*', { count: 'exact' }).eq('role', role).order('created_at', { ascending: false }).range(from, to);
	if (search) {
		const s = String(search).replace(/%/g, '');
		q = q.or(`email.ilike.%${s}%,name.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%`);
	}
	const { data, error, count } = await q;
	if (error) throw error;
	const total = count ?? 0;
	return {
		items: (data || []).map(mapProfileRow),
		page: pageNum,
		perPage: pageLimit,
		totalItems: total,
		totalPages: Math.max(1, Math.ceil(total / pageLimit)),
	};
}

router.get('/patients', checkPermission('manage_users'), async (req, res) => {
	const result = await listProfiles('individual', req.query);
	logger.info(`[ADMIN-USERS] Listed ${result.items.length} patients`);
	res.json(result);
});

router.get('/patients/:id', checkPermission('manage_users'), async (req, res) => {
	const { id } = req.params;
	const { data: patient, error } = await sb().from('profiles').select('*').eq('id', id).eq('role', 'individual').maybeSingle();
	if (error) throw error;
	if (!patient) return res.status(404).json({ error: 'Patient not found' });
	let healthProfile = null;
	const { data: hp } = await sb().from('patients').select('*').eq('user_id', id).maybeSingle();
	if (hp) healthProfile = hp;
	res.json({ patient: mapProfileRow(patient), healthProfile });
});

router.patch('/patients/:id', checkPermission('manage_users'), async (req, res) => {
	const { id } = req.params;
	const { status, subscription_status, subscription_plan, notes } = req.body;
	const updateData = {};
	if (status) updateData.status = status;
	if (subscription_status) updateData.subscription_status = subscription_status;
	if (subscription_plan) updateData.subscription_plan = subscription_plan;
	if (notes) updateData.admin_notes = notes;
	const { data, error } = await sb().from('profiles').update(updateData).eq('id', id).eq('role', 'individual').select().maybeSingle();
	if (error) throw error;
	await req.auditLog('UPDATE_PATIENT', 'user', id, updateData);
	res.json({ success: true, patient: mapProfileRow(data) });
});

router.delete('/patients/:id', checkPermission('manage_users'), async (req, res) => {
	const { id } = req.params;
	if (req.query.confirm !== 'true') {
		return res.status(400).json({ error: 'Deletion must be confirmed with ?confirm=true' });
	}
	const { data: patient } = await sb().from('profiles').select('email').eq('id', id).maybeSingle();
	const { error } = await sb().auth.admin.deleteUser(id);
	if (error) throw error;
	await req.auditLog('DELETE_PATIENT', 'user', id, { email: patient?.email });
	res.json({ success: true, message: 'Patient deleted successfully' });
});

router.get('/employers', checkPermission('manage_users'), async (req, res) => {
	const result = await listProfiles('employer', req.query);
	logger.info(`[ADMIN-USERS] Listed ${result.items.length} employers`);
	res.json(result);
});

router.get('/employers/:id', checkPermission('manage_users'), async (req, res) => {
	const { id } = req.params;
	const { data, error } = await sb().from('profiles').select('*').eq('id', id).eq('role', 'employer').maybeSingle();
	if (error) throw error;
	if (!data) return res.status(404).json({ error: 'Employer not found' });
	res.json(mapProfileRow(data));
});

router.patch('/employers/:id', checkPermission('manage_users'), async (req, res) => {
	const { id } = req.params;
	const { status, company_name, subscription_plan, notes } = req.body;
	const updateData = {};
	if (status) updateData.status = status;
	if (company_name) updateData.company_name = company_name;
	if (subscription_plan) updateData.subscription_plan = subscription_plan;
	if (notes) updateData.admin_notes = notes;
	const { data, error } = await sb().from('profiles').update(updateData).eq('id', id).eq('role', 'employer').select().maybeSingle();
	if (error) throw error;
	await req.auditLog('UPDATE_EMPLOYER', 'user', id, updateData);
	res.json({ success: true, employer: mapProfileRow(data) });
});

router.delete('/employers/:id', checkPermission('manage_users'), async (req, res) => {
	const { id } = req.params;
	if (req.query.confirm !== 'true') {
		return res.status(400).json({ error: 'Deletion must be confirmed with ?confirm=true' });
	}
	const { data: employer } = await sb().from('profiles').select('email').eq('id', id).maybeSingle();
	const { error } = await sb().auth.admin.deleteUser(id);
	if (error) throw error;
	await req.auditLog('DELETE_EMPLOYER', 'user', id, { email: employer?.email });
	res.json({ success: true, message: 'Employer deleted successfully' });
});

router.get('/insurance', checkPermission('manage_users'), async (req, res) => {
	const result = await listProfiles('insurance', req.query);
	logger.info(`[ADMIN-USERS] Listed ${result.items.length} insurance profiles`);
	res.json(result);
});

router.get('/insurance/:id', checkPermission('manage_users'), async (req, res) => {
	const { id } = req.params;
	const { data, error } = await sb().from('profiles').select('*').eq('id', id).eq('role', 'insurance').maybeSingle();
	if (error) throw error;
	if (!data) return res.status(404).json({ error: 'Insurance profile not found' });
	res.json(mapProfileRow(data));
});

router.patch('/insurance/:id', checkPermission('manage_users'), async (req, res) => {
	const { id } = req.params;
	const { status, company_name, api_key, notes } = req.body;
	const updateData = {};
	if (status) updateData.status = status;
	if (company_name) updateData.company_name = company_name;
	if (api_key) updateData.api_key = api_key;
	if (notes) updateData.admin_notes = notes;
	const { data, error } = await sb().from('profiles').update(updateData).eq('id', id).eq('role', 'insurance').select().maybeSingle();
	if (error) throw error;
	await req.auditLog('UPDATE_INSURANCE', 'user', id, updateData);
	res.json({ success: true, provider: mapProfileRow(data) });
});

router.delete('/insurance/:id', checkPermission('manage_users'), async (req, res) => {
	const { id } = req.params;
	if (req.query.confirm !== 'true') {
		return res.status(400).json({ error: 'Deletion must be confirmed with ?confirm=true' });
	}
	const { data: row } = await sb().from('profiles').select('email').eq('id', id).maybeSingle();
	const { error } = await sb().auth.admin.deleteUser(id);
	if (error) throw error;
	await req.auditLog('DELETE_INSURANCE', 'user', id, { email: row?.email });
	res.json({ success: true, message: 'Insurance provider deleted successfully' });
});

export default router;
