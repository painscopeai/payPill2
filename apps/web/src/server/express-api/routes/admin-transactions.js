import { Router } from 'express';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';
import { checkPermission, attachAuditLog, HttpError } from '../middleware/rbac.js';

const router = Router();
router.use(attachAuditLog);

const sb = () => getSupabaseAdmin();

function mapTx(row) {
	if (!row) return row;
	return {
		...row,
		type: row.transaction_type || row.type,
		created: row.created_at || row.created,
	};
}

/** Static paths must be registered before `/:id`. */
router.get('/export/csv', checkPermission('view_transactions'), async (req, res) => {
	const { start_date, end_date } = req.query;
	let q = sb().from('transactions').select('*').order('created_at', { ascending: false }).limit(5000);
	if (start_date) q = q.gte('created_at', start_date);
	if (end_date) q = q.lte('created_at', end_date);
	const { data, error } = await q;
	if (error) throw error;
	const transactions = (data || []).map(mapTx);
	const headers = ['ID', 'User ID', 'Type', 'Amount', 'Status', 'Created', 'Description'];
	const rows = transactions.map((t) => [
		t.id,
		t.user_id,
		t.type,
		t.amount,
		t.status,
		t.created,
		t.description || '',
	]);
	const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
	const filename = `transactions-${Date.now()}.csv`;
	res.setHeader('Content-Type', 'text/csv');
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	res.send(csv);
	logger.info(`[ADMIN-TRANSACTIONS] Exported ${transactions.length} transactions`);
});

router.get('/analytics/summary', checkPermission('view_transactions'), async (req, res) => {
	const { start_date, end_date } = req.query;
	let q = sb().from('transactions').select('*').limit(5000);
	if (start_date) q = q.gte('created_at', start_date);
	if (end_date) q = q.lte('created_at', end_date);
	const { data, error } = await q;
	if (error) throw error;
	const transactions = (data || []).map(mapTx);
	const analytics = {
		total_transactions: transactions.length,
		total_revenue: transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0),
		completed: transactions.filter((t) => t.status === 'completed').length,
		pending: transactions.filter((t) => t.status === 'pending').length,
		failed: transactions.filter((t) => t.status === 'failed').length,
		refunded: transactions.filter((t) => t.status === 'refunded').length,
		by_type: {},
	};
	transactions.forEach((t) => {
		const ty = t.type || 'unknown';
		if (!analytics.by_type[ty]) analytics.by_type[ty] = { count: 0, amount: 0 };
		analytics.by_type[ty].count += 1;
		analytics.by_type[ty].amount += parseFloat(t.amount) || 0;
	});
	res.json(analytics);
});

router.get('/', checkPermission('view_transactions'), async (req, res) => {
	const { type, status, user_id, start_date, end_date, page, limit } = req.query;
	const pageNum = parseInt(page, 10) || 1;
	const pageLimit = Math.min(parseInt(limit, 10) || 50, 500);
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;
	let q = sb().from('transactions').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
	if (type) q = q.eq('transaction_type', type);
	if (status) q = q.eq('status', status);
	if (user_id) q = q.eq('user_id', user_id);
	if (start_date) q = q.gte('created_at', start_date);
	if (end_date) q = q.lte('created_at', end_date);
	const { data, error, count } = await q;
	if (error) throw error;
	const total = count ?? 0;
	res.json({
		items: (data || []).map(mapTx),
		page: pageNum,
		perPage: pageLimit,
		totalItems: total,
		totalPages: Math.max(1, Math.ceil(total / pageLimit)),
	});
});

router.get('/:id', checkPermission('view_transactions'), async (req, res) => {
	const { id } = req.params;
	const { data: transaction, error } = await sb().from('transactions').select('*').eq('id', id).maybeSingle();
	if (error) throw error;
	if (!transaction) return res.status(404).json({ error: 'Not found' });
	let userInfo = null;
	if (transaction.user_id) {
		const { data: u } = await sb().from('profiles').select('*').eq('id', transaction.user_id).maybeSingle();
		userInfo = u;
	}
	res.json({ transaction: mapTx(transaction), userInfo });
});

router.post('/:id/refund', checkPermission('manage_transactions'), async (req, res) => {
	const { id } = req.params;
	const { reason, amount } = req.body;
	if (!reason) return res.status(400).json({ error: 'Missing required field: reason' });
	const { data: transaction, error: ge } = await sb().from('transactions').select('*').eq('id', id).maybeSingle();
	if (ge) throw ge;
	if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
	if (transaction.status === 'refunded') throw new HttpError(400, 'Transaction is already refunded');
	if (transaction.status !== 'completed') throw new HttpError(400, 'Only completed transactions can be refunded');
	const refundAmount = amount ? parseFloat(amount) : parseFloat(transaction.amount) || 0;
	const { data: refund, error: re } = await sb()
		.from('refunds')
		.insert({
			transaction_id: id,
			user_id: transaction.user_id,
			amount: refundAmount,
			reason,
			status: 'pending',
			processed_by: req.adminId,
			processed_at: new Date().toISOString(),
		})
		.select()
		.single();
	if (re) throw re;
	const { error: ue } = await sb()
		.from('transactions')
		.update({ status: 'refunded', refund_id: refund.id })
		.eq('id', id);
	if (ue) throw ue;
	await req.auditLog('PROCESS_REFUND', 'transaction', id, { amount: refundAmount, reason });
	res.json({ success: true, refund });
});

export default router;
