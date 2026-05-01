import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';

const router = new App();
const sb = () => getSupabaseAdmin();

router.get('/', async (req, res) => {
	const { user_id } = req.query;
	if (!user_id) {
		return res.status(400).json({ error: 'Missing required query parameter: user_id' });
	}

	const { data: refillRequests, error } = await sb()
		.from('refill_requests')
		.select('*')
		.eq('user_id', user_id)
		.order('requested_at', { ascending: false });

	if (error) {
		logger.error('[refill-status]', error);
		return res.status(500).json({ error: 'Failed to load refill requests' });
	}

	const refillsWithDetails = await Promise.all(
		(refillRequests || []).map(async (refill) => {
			try {
				const { data: prescription } = await sb()
					.from('prescriptions')
					.select('*')
					.eq('id', refill.prescription_id)
					.maybeSingle();
				let pharmacy = null;
				if (refill.pharmacy_id) {
					const { data: ph } = await sb()
						.from('pharmacies')
						.select('*')
						.eq('id', refill.pharmacy_id)
						.maybeSingle();
					pharmacy = ph;
				}
				return { ...refill, prescription_details: prescription, pharmacy_details: pharmacy };
			} catch (e) {
				logger.warn(`[refill-status] detail fetch: ${e.message}`);
				return refill;
			}
		}),
	);

	return res.json(refillsWithDetails);
});

export default router;
