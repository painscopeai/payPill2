import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';

const router = new App();
const sb = () => getSupabaseAdmin();

function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

router.get('/', async (req, res) => {
	const { location, latitude, longitude, type } = req.query;

	let q = sb().from('pharmacies').select('*');
	if (type) q = q.eq('type', String(type));

	const { data: pharmacies, error } = await q;
	if (error) {
		logger.error('[pharmacies]', error);
		return res.status(500).json({ error: 'Failed to load pharmacies' });
	}

	const list = pharmacies || [];

	if (latitude && longitude) {
		const lat = parseFloat(String(latitude));
		const lon = parseFloat(String(longitude));
		if (Number.isNaN(lat) || Number.isNaN(lon)) {
			return res.status(400).json({ error: 'Invalid latitude or longitude values' });
		}
		const withDistance = list
			.filter((p) => p.latitude != null && p.longitude != null)
			.map((pharmacy) => ({
				...pharmacy,
				distance_km: calculateDistance(lat, lon, pharmacy.latitude, pharmacy.longitude),
			}))
			.sort((a, b) => a.distance_km - b.distance_km);
		return res.json(withDistance);
	}

	if (location) {
		const loc = String(location).toLowerCase();
		const filtered = list.filter(
			(p) =>
				(p.address && p.address.toLowerCase().includes(loc)) ||
				(p.zip_code && String(p.zip_code).includes(String(location))),
		);
		return res.json(filtered);
	}

	return res.json(list);
});

export default router;
