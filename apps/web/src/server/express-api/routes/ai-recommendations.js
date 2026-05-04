import 'dotenv/config';
import { App } from '@tinyhttp/app';
import axios from 'axios';
import logger from '../utils/logger.js';
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import {
	buildAiWebhookPatientBody,
	hasUsablePatientPayload,
} from '../utils/aiWebhookPatientPayload.js';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const router = new App();

router.use(requireSupabaseUser);

/**
 * POST /ai-recommendations
 * Expects JSON from the client (same raw rows as GET /patient-health-overview?includeRaw=1):
 * { onboardingSteps: [...], healthRecords: [...] }
 * Server trusts session userId only — forwards to n8n without re-querying Supabase.
 */
router.post('/', async (req, res) => {
	const userId = req.user.id;
	const body = req.body && typeof req.body === 'object' ? req.body : {};

	const onboardingSteps = body.onboardingSteps;
	const healthRecords = body.healthRecords;

	if (!Array.isArray(onboardingSteps) || !Array.isArray(healthRecords)) {
		return res.status(400).json({
			error: 'Missing payload',
			message:
				'Send onboardingSteps and healthRecords arrays (load Basic profile / patient-health-overview with includeRaw=1 first).',
		});
	}

	if (body.userId != null && body.userId !== userId) {
		return res.status(403).json({ error: 'Payload does not match signed-in user' });
	}

	if (!hasUsablePatientPayload(onboardingSteps, healthRecords)) {
		return res.status(400).json({
			error: 'Insufficient patient data',
			message:
				'Save at least one onboarding answer or add a health record before requesting AI recommendations.',
		});
	}

	const patientBody = buildAiWebhookPatientBody(userId, onboardingSteps, healthRecords);
	const userPrompt = JSON.stringify(patientBody, null, 2);

	const n8nPayload = {
		source: 'paypill',
		version: 2,
		userPrompt,
		...patientBody,
	};

	const n8nWebhookUrl =
		process.env.N8N_AI_RECOMMENDATIONS_WEBHOOK_URL?.trim() ||
		'https://silentminds.app.n8n.cloud/webhook/ai';

	const ackTimeoutMs = Math.min(
		60_000,
		Math.max(3_000, Number(process.env.N8N_WEBHOOK_ACK_TIMEOUT_MS) || 12_000),
	);

	const n8nHeaders = { 'Content-Type': 'application/json' };
	const whSecret = process.env.N8N_AI_WEBHOOK_SECRET?.trim();
	if (whSecret) {
		n8nHeaders['X-PayPill-Webhook-Secret'] = whSecret;
	}

	logger.info(
		`[ai-recommendations] POST → n8n user=${userId} rows=${onboardingSteps.length} records=${healthRecords.length} url=${n8nWebhookUrl}`,
	);

	let n8nResponse;
	try {
		n8nResponse = await axios.post(n8nWebhookUrl, n8nPayload, {
			headers: n8nHeaders,
			timeout: ackTimeoutMs,
			validateStatus: (s) => s >= 200 && s < 300,
		});
	} catch (err) {
		const isTimeout = err?.code === 'ECONNABORTED' || /timeout/i.test(String(err.message));
		const apiMsg = err.response?.data?.message || err.response?.data?.error || err.message;
		logger.error(`[ai-recommendations] n8n webhook ack failed: ${err.message}`, String(apiMsg || ''));
		return res.status(isTimeout ? 504 : 502).json({
			error: isTimeout ? 'AI workflow did not acknowledge in time' : 'Could not reach AI workflow',
			message: typeof apiMsg === 'string' ? apiMsg : undefined,
		});
	}

	const raw = n8nResponse.data;
	if (raw && typeof raw === 'object' && raw.success === false && raw.error != null) {
		logger.warn(`[ai-recommendations] n8n reported failure: ${raw.error}`);
		return res.status(502).json({
			error: 'AI workflow reported failure',
			message: String(raw.error),
		});
	}

	return res.status(202).json({
		accepted: true,
		async: true,
		message:
			'Request accepted. Recommendations are generated in the background; refresh the list shortly.',
		onboarding_rows: onboardingSteps.length,
		health_records: healthRecords.length,
		generatedAt: new Date().toISOString(),
	});
});

router.get('/', async (req, res) => {
	const userId = req.user.id;
	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('patient_recommendations')
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false })
		.limit(100);

	if (error) {
		logger.error(`[ai-recommendations] list failed: ${error.message}`);
		return res.status(500).json({ error: 'Failed to load recommendations' });
	}

	return res.json(data || []);
});

router.post('/:id/accept', async (req, res) => {
	const { id } = req.params;
	const userId = req.user.id;
	if (!UUID_RE.test(id)) {
		return res.status(400).json({ error: 'Invalid id' });
	}
	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('patient_recommendations')
		.update({ status: 'Accepted' })
		.eq('id', id)
		.eq('user_id', userId)
		.select()
		.maybeSingle();
	if (error) {
		logger.error(`[ai-recommendations] accept: ${error.message}`);
		return res.status(500).json({ error: 'Failed to update recommendation' });
	}
	if (!data) {
		return res.status(404).json({ error: 'Not found' });
	}
	return res.json(data);
});

router.post('/:id/decline', async (req, res) => {
	const { id } = req.params;
	const userId = req.user.id;
	if (!UUID_RE.test(id)) {
		return res.status(400).json({ error: 'Invalid id' });
	}
	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('patient_recommendations')
		.update({ status: 'Declined' })
		.eq('id', id)
		.eq('user_id', userId)
		.select()
		.maybeSingle();
	if (error) {
		logger.error(`[ai-recommendations] decline: ${error.message}`);
		return res.status(500).json({ error: 'Failed to update recommendation' });
	}
	if (!data) {
		return res.status(404).json({ error: 'Not found' });
	}
	return res.json(data);
});

router.post('/:id/refine', async (req, res) => {
	return res.json({ success: true });
});

router.get('/:id', async (req, res) => {
	const { id } = req.params;
	const userId = req.user.id;
	const sb = getSupabaseAdmin();

	const { data: row, error } = await sb
		.from('patient_recommendations')
		.select('*')
		.eq('id', id)
		.maybeSingle();

	if (error) {
		return res.status(500).json({ error: 'Failed to load recommendation' });
	}
	if (!row || row.user_id !== userId) {
		return res.status(404).json({ error: 'Not found' });
	}

	return res.json(row);
});

export default router;
