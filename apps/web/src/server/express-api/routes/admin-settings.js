import { Router } from 'express';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';
import { checkRole, attachAuditLog } from '../middleware/rbac.js';

const router = Router();
router.use(attachAuditLog);
const sb = () => getSupabaseAdmin();

async function upsertSetting(key, valueJson) {
	const { data: existing } = await sb().from('system_settings').select('id').eq('key', key).maybeSingle();
	if (existing?.id) {
		const { data, error } = await sb().from('system_settings').update({ value: valueJson }).eq('id', existing.id).select().single();
		if (error) throw error;
		return data;
	}
	const { data, error } = await sb().from('system_settings').insert({ key, value: valueJson }).select().single();
	if (error) throw error;
	return data;
}

router.get('/export/all', checkRole('admin'), async (req, res) => {
	const { data: settings, error } = await sb().from('system_settings').select('*');
	if (error) throw error;
	const exportData = {};
	for (const s of settings || []) {
		exportData[s.key] = s.value;
	}
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Content-Disposition', `attachment; filename="settings-${Date.now()}.json"`);
	res.json(exportData);
	logger.info('[ADMIN-SETTINGS] Exported all settings');
});

router.patch('/notification-templates/:id', checkRole('admin'), async (req, res) => {
	const { id } = req.params;
	const { subject, body, variables } = req.body;
	const updateData = {};
	if (subject) updateData.subject = subject;
	if (body) updateData.body = body;
	if (variables) updateData.variables = variables;
	const { data, error } = await sb().from('notification_templates').update(updateData).eq('id', id).select().single();
	if (error) throw error;
	await req.auditLog('UPDATE_NOTIFICATION_TEMPLATE', 'notification_template', id, updateData);
	res.json({ success: true, template: data });
});

router.patch('/email-config', checkRole('admin'), async (req, res) => {
	const { smtp_host, smtp_port, smtp_user, smtp_password, from_email, from_name } = req.body;
	const updateData = {};
	if (smtp_host) updateData.smtp_host = smtp_host;
	if (smtp_port) updateData.smtp_port = parseInt(smtp_port, 10);
	if (smtp_user) updateData.smtp_user = smtp_user;
	if (smtp_password) updateData.smtp_password = smtp_password;
	if (from_email) updateData.from_email = from_email;
	if (from_name) updateData.from_name = from_name;
	const row = await upsertSetting('email_config', updateData);
	await req.auditLog('UPDATE_EMAIL_CONFIG', 'system_setting', row.id);
	res.json({ success: true, config: updateData });
});

router.patch('/payment-config', checkRole('admin'), async (req, res) => {
	const { stripe_key, stripe_secret, payment_methods, currency } = req.body;
	const updateData = {};
	if (stripe_key) updateData.stripe_key = stripe_key;
	if (stripe_secret) updateData.stripe_secret = stripe_secret;
	if (payment_methods) updateData.payment_methods = payment_methods;
	if (currency) updateData.currency = currency;
	const row = await upsertSetting('payment_config', updateData);
	await req.auditLog('UPDATE_PAYMENT_CONFIG', 'system_setting', row.id);
	res.json({ success: true, config: updateData });
});

router.patch('/feature-toggles', checkRole('admin'), async (req, res) => {
	const { features } = req.body;
	if (!features || typeof features !== 'object') {
		return res.status(400).json({ error: 'Missing required field: features (must be an object)' });
	}
	const row = await upsertSetting('feature_toggles', features);
	await req.auditLog('UPDATE_FEATURE_TOGGLES', 'system_setting', row.id, features);
	res.json({ success: true, features });
});

router.get('/', checkRole('admin'), async (req, res) => {
	const { data: settings, error } = await sb().from('system_settings').select('*');
	if (error) throw error;
	res.json({ items: settings || [], count: (settings || []).length });
});

router.get('/:key', checkRole('admin'), async (req, res) => {
	const { key } = req.params;
	const { data: setting, error } = await sb().from('system_settings').select('*').eq('key', key).maybeSingle();
	if (error) throw error;
	if (!setting) return res.status(404).json({ error: 'Setting not found' });
	res.json(setting);
});

router.patch('/:key', checkRole('admin'), async (req, res) => {
	const { key } = req.params;
	const { value, description } = req.body;
	if (value === undefined) return res.status(400).json({ error: 'Missing required field: value' });
	const payload = { value };
	if (description !== undefined) payload.description = description;
	const { data: existing } = await sb().from('system_settings').select('id').eq('key', key).maybeSingle();
	let row;
	if (!existing?.id) {
		const { data, error } = await sb().from('system_settings').insert({ key, value, description: description || '' }).select().single();
		if (error) throw error;
		row = data;
		await req.auditLog('CREATE_SETTING', 'system_setting', row.id, { key, value });
	} else {
		const { data, error } = await sb().from('system_settings').update(payload).eq('id', existing.id).select().single();
		if (error) throw error;
		row = data;
		await req.auditLog('UPDATE_SETTING', 'system_setting', existing.id, { key, value });
	}
	res.json({ success: true, setting: row });
});

export default router;
