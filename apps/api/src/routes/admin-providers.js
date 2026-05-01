import { Router } from 'express';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';
import { checkPermission, attachAuditLog, HttpError } from '../middleware/rbac.js';

const router = Router();
router.use(attachAuditLog);

const sb = () => getSupabaseAdmin();

function mapProvider(r) {
	if (!r) return r;
	return {
		...r,
		created: r.created_at || r.created,
		name: r.name || r.provider_name,
	};
}

router.get('/analytics/summary', checkPermission('manage_providers'), async (req, res) => {
	const { data, error } = await sb().from('providers').select('*').limit(5000);
	if (error) throw error;
	const providers = data || [];
	const analytics = {
		total_providers: providers.length,
		active: providers.filter((p) => p.status === 'active').length,
		pending: providers.filter((p) => p.status === 'pending').length,
		inactive: providers.filter((p) => p.status === 'inactive').length,
		by_type: {},
		by_specialty: {},
		telemedicine_available: providers.filter((p) => p.telemedicine_available).length,
	};
	providers.forEach((p) => {
		const ty = p.type || 'unknown';
		analytics.by_type[ty] = (analytics.by_type[ty] || 0) + 1;
		if (p.specialty) {
			analytics.by_specialty[p.specialty] = (analytics.by_specialty[p.specialty] || 0) + 1;
		}
	});
	res.json(analytics);
});

router.get('/', checkPermission('manage_providers'), async (req, res) => {
	const { type, status, specialty, search, page, limit } = req.query;
	const pageNum = parseInt(page, 10) || 1;
	const pageLimit = Math.min(parseInt(limit, 10) || 50, 500);
	const from = (pageNum - 1) * pageLimit;
	const to = from + pageLimit - 1;
	let q = sb().from('providers').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
	if (type) q = q.eq('type', type);
	if (status) q = q.eq('status', status);
	if (specialty) q = q.ilike('specialty', `%${specialty}%`);
	if (search) {
		const s = String(search).replace(/%/g, '');
		q = q.or(`name.ilike.%${s}%,provider_name.ilike.%${s}%,email.ilike.%${s}%`);
	}
	const { data, error, count } = await q;
	if (error) throw error;
	const total = count ?? 0;
	res.json({
		items: (data || []).map(mapProvider),
		page: pageNum,
		perPage: pageLimit,
		totalItems: total,
		totalPages: Math.max(1, Math.ceil(total / pageLimit)),
	});
});

router.post('/', checkPermission('manage_providers'), async (req, res) => {
	const {
		provider_name,
		name,
		type,
		specialty,
		email,
		phone,
		address,
		latitude,
		longitude,
		telemedicine_available,
		status,
	} = req.body;
	const displayName = name || provider_name;
	if (!displayName || !type || !email) {
		return res.status(400).json({ error: 'Missing required fields: name (or provider_name), type, email' });
	}
	const row = {
		name: displayName,
		provider_name: displayName,
		type,
		specialty: specialty || '',
		email,
		phone: phone || '',
		address: address || '',
		latitude: latitude ? parseFloat(latitude) : null,
		longitude: longitude ? parseFloat(longitude) : null,
		telemedicine_available: telemedicine_available !== false,
		status: status || 'pending',
	};
	const { data, error } = await sb().from('providers').insert(row).select().single();
	if (error) throw error;
	await req.auditLog('CREATE_PROVIDER', 'provider', data.id, row);
	res.status(201).json({ success: true, provider: mapProvider(data) });
});

router.get('/:id', checkPermission('manage_providers'), async (req, res) => {
	const { id } = req.params;
	const { data, error } = await sb().from('providers').select('*').eq('id', id).maybeSingle();
	if (error) throw error;
	if (!data) return res.status(404).json({ error: 'Not found' });
	res.json(mapProvider(data));
});

router.patch('/:id', checkPermission('manage_providers'), async (req, res) => {
	const { id } = req.params;
	const { provider_name, name, specialty, phone, address, latitude, longitude, telemedicine_available, status } = req.body;
	const updateData = {};
	if (provider_name || name) updateData.name = name || provider_name;
	if (provider_name || name) updateData.provider_name = name || provider_name;
	if (specialty !== undefined) updateData.specialty = specialty;
	if (phone !== undefined) updateData.phone = phone;
	if (address !== undefined) updateData.address = address;
	if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
	if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
	if (telemedicine_available !== undefined) updateData.telemedicine_available = telemedicine_available;
	if (status) updateData.status = status;
	const { data, error } = await sb().from('providers').update(updateData).eq('id', id).select().single();
	if (error) throw error;
	await req.auditLog('UPDATE_PROVIDER', 'provider', id, updateData);
	res.json({ success: true, provider: mapProvider(data) });
});

router.delete('/:id', checkPermission('manage_providers'), async (req, res) => {
	const { id } = req.params;
	if (req.query.confirm !== 'true') {
		return res.status(400).json({ error: 'Deletion must be confirmed with ?confirm=true' });
	}
	const { data: provider } = await sb().from('providers').select('name, provider_name').eq('id', id).maybeSingle();
	const { error } = await sb().from('providers').delete().eq('id', id);
	if (error) throw error;
	await req.auditLog('DELETE_PROVIDER', 'provider', id, { name: provider?.name });
	res.json({ success: true, message: 'Provider deleted successfully' });
});

router.patch('/:id/approve', checkPermission('manage_providers'), async (req, res) => {
	const { id } = req.params;
	const { data: provider, error: fe } = await sb().from('providers').select('*').eq('id', id).maybeSingle();
	if (fe) throw fe;
	if (!provider) return res.status(404).json({ error: 'Not found' });
	if (provider.status !== 'pending') throw new HttpError(400, 'Only pending providers can be approved');
	const { data, error } = await sb()
		.from('providers')
		.update({
			status: 'active',
			approved_at: new Date().toISOString(),
			approved_by: req.adminId,
		})
		.eq('id', id)
		.select()
		.single();
	if (error) throw error;
	await req.auditLog('APPROVE_PROVIDER', 'provider', id);
	res.json({ success: true, provider: mapProvider(data) });
});

export default router;
