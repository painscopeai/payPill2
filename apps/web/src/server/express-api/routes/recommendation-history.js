import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import { getBearerAuthContext } from '../utils/supabaseAuthExpress.js';

const router = new App();
const sb = () => getSupabaseAdmin();

/**
 * GET /recommendation-history
 * Aggregates patient_recommendations for the signed-in user (Supabase).
 */
router.get('/', async (req, res) => {
	const ctx = await getBearerAuthContext(req);
	if (!ctx?.userId) {
		return res.status(401).json({ error: 'Authentication required' });
	}

	const userId = ctx.userId;

	const { data: recommendations, error: rErr } = await sb()
		.from('patient_recommendations')
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	if (rErr) {
		logger.error('[recommendation-history]', rErr);
		return res.status(500).json({ error: 'Failed to load history' });
	}

	const avgConfidence =
		(recommendations || []).length > 0
			? (recommendations || []).reduce((s, r) => s + (Number(r.confidence_score) || 0), 0) /
				(recommendations || []).length
			: 0;

	return res.json({
		history: [],
		statistics: {
			total_recommendations: (recommendations || []).length,
			average_confidence: avgConfidence,
			items: recommendations || [],
		},
	});
});

export default router;
