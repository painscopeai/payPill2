import { App } from '@tinyhttp/app';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';
import { checkPermission, attachAuditLog } from '../middleware/rbac.js';

const router = new App();
router.use(attachAuditLog);
const sb = () => getSupabaseAdmin();

router.get('/plans', checkPermission('manage_subscriptions'), async (req, res) => {
	const { status, page, limit } = req.query;
	const pageNum = parseInt(page, 10) || 1;
	const pageLimit = Math.min(parseInt(limit, 10) || 50, 500);
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;
	let q = sb().from('subscription_plans').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
	if (status) q = q.eq('status', status);
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

router.post('/plans', checkPermission('manage_subscriptions'), async (req, res) => {
	const { name, description, price, billing_cycle, features, status } = req.body;
	if (!name || price == null || !billing_cycle) {
		return res.status(400).json({ error: 'Missing required fields: name, price, billing_cycle' });
	}
	const row = {
		name,
		description: description || '',
		price_monthly: parseFloat(price),
		price: parseFloat(price),
		billing_cycle,
		features: features || [],
		status: status || 'active',
	};
	const { data, error } = await sb().from('subscription_plans').insert(row).select().single();
	if (error) throw error;
	await req.auditLog('CREATE_PLAN', 'subscription_plan', data.id, row);
	res.status(201).json({ success: true, plan: data });
});

router.patch('/plans/:id', checkPermission('manage_subscriptions'), async (req, res) => {
	const { id } = req.params;
	const { name, description, price, features, status } = req.body;
	const updateData = {};
	if (name) updateData.name = name;
	if (description !== undefined) updateData.description = description;
	if (price != null) {
		updateData.price = parseFloat(price);
		updateData.price_monthly = parseFloat(price);
	}
	if (features !== undefined) updateData.features = features;
	if (status) updateData.status = status;
	const { data, error } = await sb().from('subscription_plans').update(updateData).eq('id', id).select().single();
	if (error) throw error;
	await req.auditLog('UPDATE_PLAN', 'subscription_plan', id, updateData);
	res.json({ success: true, plan: data });
});

router.delete('/plans/:id', checkPermission('manage_subscriptions'), async (req, res) => {
	const { id } = req.params;
	if (req.query.confirm !== 'true') return res.status(400).json({ error: 'Deletion must be confirmed with ?confirm=true' });
	const { data: plan } = await sb().from('subscription_plans').select('name').eq('id', id).maybeSingle();
	const { error } = await sb().from('subscription_plans').delete().eq('id', id);
	if (error) throw error;
	await req.auditLog('DELETE_PLAN', 'subscription_plan', id, { name: plan?.name });
	res.json({ success: true, message: 'Subscription plan deleted successfully' });
});

router.get('/monitoring/status', checkPermission('manage_subscriptions'), async (req, res) => {
	const { data: subscriptions, error } = await sb().from('subscriptions').select('*').limit(5000);
	if (error) throw error;
	const now = new Date();
	const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	const status = { active: 0, expired: 0, expiring_soon: 0, cancelled: 0 };
	for (const sub of subscriptions || []) {
		if (sub.status === 'cancelled') status.cancelled += 1;
		else if (sub.end_date) {
			const endDate = new Date(sub.end_date);
			if (endDate < now) status.expired += 1;
			else if (endDate < thirtyDaysFromNow) status.expiring_soon += 1;
			else status.active += 1;
		} else status.active += 1;
	}
	res.json(status);
});

router.get('/logs', checkPermission('manage_subscriptions'), async (req, res) => {
	const { action, page, limit } = req.query;
	const pageNum = parseInt(page, 10) || 1;
	const pageLimit = Math.min(parseInt(limit, 10) || 50, 500);
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;
	let q = sb().from('subscription_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
	if (action) q = q.eq('action', action);
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

router.post('/export', checkPermission('manage_subscriptions'), async (req, res) => {
	const { data: subscriptions, error } = await sb().from('subscriptions').select('*').order('created_at', { ascending: false }).limit(5000);
	if (error) throw error;
	const headers = ['ID', 'User ID', 'Plan ID', 'Status', 'Start Date', 'End Date', 'Auto Renew', 'Created'];
	const rows = (subscriptions || []).map((s) => [
		s.id,
		s.user_id,
		s.plan_id,
		s.status,
		s.start_date,
		s.end_date || '',
		s.auto_renew ? 'Yes' : 'No',
		s.created_at,
	]);
	const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
	res.setHeader('Content-Type', 'text/csv');
	res.setHeader('Content-Disposition', `attachment; filename="subscriptions-${Date.now()}.csv"`);
	res.send(csv);
});

router.get('/', checkPermission('manage_subscriptions'), async (req, res) => {
	const { status, user_id, plan_id, page, limit } = req.query;
	const pageNum = parseInt(page, 10) || 1;
	const pageLimit = Math.min(parseInt(limit, 10) || 50, 500);
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;
	let q = sb().from('subscriptions').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
	if (status) q = q.eq('status', status);
	if (user_id) q = q.eq('user_id', user_id);
	if (plan_id) q = q.eq('plan_id', plan_id);
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

router.post('/', checkPermission('manage_subscriptions'), async (req, res) => {
	const { user_id, plan_id, start_date, auto_renew } = req.body;
	if (!user_id || !plan_id) return res.status(400).json({ error: 'Missing required fields: user_id, plan_id' });
	const { data: userRow } = await sb().from('profiles').select('id').eq('id', user_id).maybeSingle();
	if (!userRow) return res.status(400).json({ error: 'User not found' });
	const { data: planRow } = await sb().from('subscription_plans').select('id, price_monthly').eq('id', plan_id).maybeSingle();
	if (!planRow) return res.status(400).json({ error: 'Plan not found' });
	const subscriptionData = {
		user_id,
		plan_id,
		start_date: start_date || new Date().toISOString(),
		auto_renew: auto_renew !== false,
		status: 'active',
		monthly_amount: parseFloat(planRow.price_monthly) || 0,
	};
	const { data, error } = await sb().from('subscriptions').insert(subscriptionData).select().single();
	if (error) throw error;
	await req.auditLog('CREATE_SUBSCRIPTION', 'subscription', data.id, subscriptionData);
	res.status(201).json({ success: true, subscription: data });
});

router.patch('/:id', checkPermission('manage_subscriptions'), async (req, res) => {
	const { id } = req.params;
	const { status, auto_renew, end_date } = req.body;
	const updateData = {};
	if (status) updateData.status = status;
	if (auto_renew !== undefined) updateData.auto_renew = auto_renew;
	if (end_date) updateData.end_date = end_date;
	const { data, error } = await sb().from('subscriptions').update(updateData).eq('id', id).select().single();
	if (error) throw error;
	await req.auditLog('UPDATE_SUBSCRIPTION', 'subscription', id, updateData);
	res.json({ success: true, subscription: data });
});

router.delete('/:id', checkPermission('manage_subscriptions'), async (req, res) => {
	const { id } = req.params;
	if (req.query.confirm !== 'true') return res.status(400).json({ error: 'Cancellation must be confirmed with ?confirm=true' });
	const { error } = await sb()
		.from('subscriptions')
		.update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
		.eq('id', id);
	if (error) throw error;
	await req.auditLog('CANCEL_SUBSCRIPTION', 'subscription', id);
	res.json({ success: true, message: 'Subscription cancelled successfully' });
});

export default router;
