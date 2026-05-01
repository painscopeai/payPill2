import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import { getBearerAuthContext } from '../utils/supabaseAuthExpress.js';

const router = new App();
const sb = () => getSupabaseAdmin();

router.use(async (req, res, next) => {
	const ctx = await getBearerAuthContext(req);
	if (!ctx?.userId) {
		return res.status(401).json({ error: 'Authentication required' });
	}
	req.providerUserId = ctx.userId;
	next();
});

router.get('/patients', async (req, res) => {
	const providerId = req.providerUserId;

	const { data: relationships, error } = await sb()
		.from('patient_provider_relationships')
		.select('*')
		.eq('provider_id', providerId);

	if (error) {
		logger.error('[provider] patients', error);
		return res.status(500).json({ error: 'Failed to load patients' });
	}

	const patientsWithDetails = await Promise.all(
		(relationships || []).map(async (relationship) => {
			try {
				const { data: user } = await sb()
					.from('profiles')
					.select('*')
					.eq('id', relationship.patient_id)
					.maybeSingle();

				const { data: steps } = await sb()
					.from('patient_onboarding_steps')
					.select('step, data')
					.eq('user_id', relationship.patient_id)
					.limit(20);

				const health_summary = Object.fromEntries((steps || []).map((s) => [`step_${s.step}`, s.data]));

				return {
					...relationship,
					patient_details: user,
					health_summary,
				};
			} catch (e) {
				logger.warn(`[provider] patient ${relationship.patient_id}: ${e.message}`);
				return relationship;
			}
		}),
	);

	return res.json(patientsWithDetails);
});

router.put('/patients/:id', async (req, res) => {
	const { id } = req.params;
	const { treatment_plan, notes } = req.body;
	const providerId = req.providerUserId;

	const { data: relationship } = await sb()
		.from('patient_provider_relationships')
		.select('id')
		.eq('provider_id', providerId)
		.eq('patient_id', id)
		.maybeSingle();

	if (!relationship) {
		return res.status(403).json({ error: 'You do not have access to this patient' });
	}

	if (notes) {
		await sb().from('clinical_notes').insert({
			user_id: id,
			provider_id: providerId,
			note_content: notes,
			date_created: new Date().toISOString(),
		});
	}

	return res.json({
		patient_id: id,
		treatment_plan: treatment_plan || null,
		updated: true,
	});
});

router.post('/notes', async (req, res) => {
	const { user_id, appointment_id, note_content } = req.body;
	const providerId = req.providerUserId;

	if (!user_id || !note_content) {
		return res.status(400).json({ error: 'Missing required fields: user_id, note_content' });
	}

	const { data: relationship } = await sb()
		.from('patient_provider_relationships')
		.select('id')
		.eq('provider_id', providerId)
		.eq('patient_id', user_id)
		.maybeSingle();

	if (!relationship) {
		return res.status(403).json({ error: 'You do not have access to this patient' });
	}

	const { data: note, error } = await sb()
		.from('clinical_notes')
		.insert({
			user_id,
			provider_id: providerId,
			appointment_id: appointment_id || null,
			note_content,
			date_created: new Date().toISOString(),
		})
		.select('id, date_created')
		.single();

	if (error) {
		logger.error('[provider] notes', error);
		return res.status(500).json({ error: 'Failed to save note' });
	}

	return res.json({ id: note.id, date_created: note.date_created });
});

export default router;
