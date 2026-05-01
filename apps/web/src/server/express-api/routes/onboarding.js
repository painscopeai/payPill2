import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import { validateStep, validateAllSteps } from '../utils/validation.js';
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import { internalApiUrl } from '../utils/internalApiUrl.js';

const router = new App();

router.use(requireSupabaseUser);

/**
 * POST /onboarding/save-step
 */
router.post('/save-step', async (req, res) => {
	const { step, data } = req.body;

	if (!req.user?.id) {
		return res.status(401).json({ error: 'Authentication failed: user not found in request' });
	}

	const patientId = req.user.id;

	if (step === undefined || step === null) {
		return res.status(400).json({ error: 'Missing required field: step' });
	}

	if (!data || typeof data !== 'object') {
		return res.status(400).json({
			error: 'Missing required field: data (must be an object)',
		});
	}

	const stepNum = parseInt(step, 10);
	if (Number.isNaN(stepNum) || stepNum < 1 || stepNum > 13) {
		return res.status(400).json({
			error: 'Invalid step number. Must be between 1 and 13.',
		});
	}

	const validation = validateStep(stepNum, data);
	if (!validation.valid) {
		return res.status(400).json({
			error: 'Validation failed',
			fields: validation.errors,
		});
	}

	const sb = getSupabaseAdmin();
	const { data: upserted, error } = await sb
		.from('patient_onboarding_steps')
		.upsert(
			{
				user_id: patientId,
				step: stepNum,
				data,
			},
			{ onConflict: 'user_id,step' },
		)
		.select('user_id, step')
		.single();

	if (error) {
		logger.error(`[onboarding] save-step upsert failed: ${error.message}`);
		return res.status(500).json({ error: 'Failed to save onboarding step' });
	}

	logger.info(`Onboarding step ${stepNum} saved for user ${patientId}`);

	return res.json({
		success: true,
		step: stepNum,
		message: `Step ${stepNum} saved successfully`,
		record_id: upserted ? `${patientId}:${stepNum}` : null,
	});
});

/**
 * GET /onboarding/progress
 */
router.get('/progress', async (req, res) => {
	if (!req.user?.id) {
		return res.status(401).json({ error: 'Authentication failed: user not found in request' });
	}

	const patientId = req.user.id;
	logger.info(`Fetching onboarding progress for user ${patientId}`);

	const sb = getSupabaseAdmin();
	const { data: rows, error } = await sb
		.from('patient_onboarding_steps')
		.select('step, data, updated_at')
		.eq('user_id', patientId)
		.order('step', { ascending: true });

	if (error) {
		logger.error(`[onboarding] progress query failed: ${error.message}`);
		return res.status(500).json({ error: 'Failed to load onboarding progress' });
	}

	const formData = {};
	const completedSteps = [];
	let lastSaved = null;

	for (const row of rows || []) {
		const stepNum = row.step;
		completedSteps.push(stepNum);
		formData[`step_${stepNum}`] = { ...(row.data || {}), updated_at: row.updated_at };

		if (row.updated_at) {
			const recordTime = new Date(row.updated_at).getTime();
			if (!lastSaved || recordTime > new Date(lastSaved).getTime()) {
				lastSaved = row.updated_at;
			}
		}
	}

	let currentStep = 1;
	for (let i = 1; i <= 13; i++) {
		if (!completedSteps.includes(i)) {
			currentStep = i;
			break;
		}
	}

	return res.json({
		currentStep,
		completedSteps: [...new Set(completedSteps)].sort((a, b) => a - b),
		formData,
		lastSaved: lastSaved || null,
	});
});

/**
 * POST /onboarding/complete
 */
router.post('/complete', async (req, res) => {
	const { allData } = req.body;

	if (!req.user?.id) {
		return res.status(401).json({ error: 'Authentication failed: user not found in request' });
	}

	const patientId = req.user.id;

	if (!allData || typeof allData !== 'object') {
		return res.status(400).json({
			error: 'Missing required field: allData (must be an object)',
		});
	}

	const validation = validateAllSteps(allData);
	if (!validation.valid) {
		return res.status(400).json({
			error: 'Validation failed for one or more steps',
			errors: validation.errors,
		});
	}

	const completedAt = new Date().toISOString();
	const sb = getSupabaseAdmin();

	const { error: profileErr } = await sb
		.from('profiles')
		.update({
			onboarding_completed: true,
			onboarding_completed_at: completedAt,
			updated_at: completedAt,
		})
		.eq('id', patientId);

	if (profileErr) {
		logger.error(`[onboarding] complete profile update failed: ${profileErr.message}`);
		return res.status(500).json({ error: 'Failed to finalize onboarding' });
	}

	logger.info(`Onboarding marked complete for user ${patientId}`);

	let recommendationsGenerated = 0;
	try {
		const url = internalApiUrl(req, '/ai-recommendations');
		const recommendationResponse = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: req.headers.authorization || '',
			},
			body: JSON.stringify({
				focus_area: 'comprehensive',
				include_history: false,
			}),
		});

		if (recommendationResponse.ok) {
			const recommendationData = await recommendationResponse.json();
			recommendationsGenerated = Array.isArray(recommendationData.recommendations)
				? recommendationData.recommendations.length
				: recommendationData.count || 0;
			logger.info(`Generated ${recommendationsGenerated} AI recommendations for user ${patientId}`);
		} else {
			logger.warn(`AI recommendations returned ${recommendationResponse.status}`);
		}
	} catch (error) {
		logger.warn(`Failed to generate AI recommendations: ${error.message}`);
	}

	return res.json({
		success: true,
		message: 'Onboarding completed successfully',
		recommendations_generated: recommendationsGenerated,
		completed_at: completedAt,
	});
});

export default router;
