import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import { getBearerAuthContext } from '../utils/supabaseAuthExpress.js';

const router = new App();
const sb = () => getSupabaseAdmin();

const VALID_ACTIONS = [
	'CREATE',
	'READ',
	'UPDATE',
	'DELETE',
	'LOGIN',
	'LOGOUT',
	'EXPORT',
	'IMPORT',
	'SHARE',
	'DOWNLOAD',
];

const VALID_RESOURCE_TYPES = [
	'user',
	'health_profile',
	'prescription',
	'appointment',
	'recommendation',
	'lab_result',
	'vital',
	'health_goal',
	'document',
	'audit_log',
];

router.post('/', async (req, res) => {
	const { user_id, action, resource_type, resource_id, ip_address, user_agent } = req.body;

	if (!user_id) {
		return res.status(400).json({ error: 'Missing required field: user_id' });
	}
	if (!action) {
		return res.status(400).json({ error: 'Missing required field: action' });
	}
	if (!resource_type) {
		return res.status(400).json({ error: 'Missing required field: resource_type' });
	}

	if (!VALID_ACTIONS.includes(String(action).toUpperCase())) {
		return res.status(400).json({
			error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
		});
	}
	if (!VALID_RESOURCE_TYPES.includes(String(resource_type).toLowerCase())) {
		return res.status(400).json({
			error: `Invalid resource_type. Must be one of: ${VALID_RESOURCE_TYPES.join(', ')}`,
		});
	}

	const row = {
		user_id,
		action: String(action).toUpperCase(),
		resource_type: String(resource_type).toLowerCase(),
		resource_id: resource_id || '',
		changes: {},
		ip_address: ip_address || '',
		user_agent: user_agent || '',
		status: 'success',
	};

	const { data: auditLog, error } = await sb().from('audit_logs').insert(row).select('id').single();
	if (error) {
		logger.error('[audit] insert', error);
		return res.status(500).json({ error: 'Failed to create audit log' });
	}

	return res.status(201).json({ success: true, log_id: auditLog.id });
});

router.get('/', async (req, res) => {
	const ctx = await getBearerAuthContext(req);
	if (!ctx?.isAdmin) {
		return res.status(403).json({ error: 'Administrator role required' });
	}

	const { user_id, action, start_date, end_date, limit } = req.query;
	let pageLimit = parseInt(String(limit), 10) || 100;
	if (pageLimit > 1000) pageLimit = 1000;
	if (pageLimit < 1) pageLimit = 1;

	let q = sb().from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(pageLimit);

	if (user_id) q = q.eq('user_id', user_id);
	if (action) q = q.eq('action', String(action).toUpperCase());
	if (start_date) q = q.gte('created_at', String(start_date));
	if (end_date) q = q.lte('created_at', String(end_date));

	const { data: items, error, count } = await q;
	if (error) {
		logger.error('[audit] list', error);
		return res.status(500).json({ error: 'Failed to fetch audit logs' });
	}

	return res.json({
		items: items || [],
		page: 1,
		perPage: pageLimit,
		totalItems: count ?? (items || []).length,
		totalPages: 1,
	});
});

export default router;
