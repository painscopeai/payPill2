import 'dotenv/config';
import { App } from '@tinyhttp/app';
import axios from 'axios';
import logger from '../utils/logger.js';
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import {
	buildPatientDataFromOnboardingRows,
	patientHasHealthSignals,
} from '../utils/patientHealthFromOnboarding.js';
import {
	normalizeFocusArea,
	focusAreaLabel,
	getFocusInstructionBlock,
	AI_SAFETY_FOOTER,
} from '../utils/aiRecommendationFocus.js';
import { buildCompactGeminiContext } from '../utils/compactGeminiContext.js';
import { buildGeminiGenerateContentUrl } from '../utils/geminiModel.js';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stripMarkdownJsonFence(s) {
	const t = String(s || '').trim();
	const m = t.match(/^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/i);
	return m ? m[1].trim() : t;
}

function extractGeminiText(data) {
	const parts = data?.candidates?.[0]?.content?.parts;
	if (!Array.isArray(parts) || !parts.length) return '';
	return parts.map((p) => (p && typeof p.text === 'string' ? p.text : '')).join('');
}

function parseRecommendationsJson(responseText) {
	const stripped = stripMarkdownJsonFence(responseText);
	try {
		return JSON.parse(stripped);
	} catch {
		const m = stripped.match(/\[\s*\{[\s\S]*\}\s*\]/);
		if (m) return JSON.parse(m[0]);
		throw new Error('No valid JSON array in model output');
	}
}

const router = new App();

router.use(requireSupabaseUser);

/** Only records from the last 24 hours (keeps prompt small and recent). */
const HEALTH_RECORDS_LOOKBACK_DAYS = 1;

async function fetchRecentHealthRecords(userId, days = HEALTH_RECORDS_LOOKBACK_DAYS) {
	const sb = getSupabaseAdmin();
	const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
	const sinceIso = new Date(sinceMs).toISOString();
	const { data, error } = await sb
		.from('patient_health_records')
		.select('record_type, title, record_date, status, provider_or_facility, notes, created_at')
		.eq('user_id', userId)
		.gte('created_at', sinceIso)
		.order('created_at', { ascending: false })
		.limit(30);
	if (error) {
		throw new Error(error.message);
	}
	return data || [];
}

async function fetchPatientDataFromSupabase(userId) {
	const sb = getSupabaseAdmin();
	const { data: rows, error } = await sb
		.from('patient_onboarding_steps')
		.select('step, data')
		.eq('user_id', userId)
		.order('step', { ascending: true });

	if (error) {
		throw new Error(error.message);
	}

	const list = rows || [];
	return {
		patientData: buildPatientDataFromOnboardingRows(userId, list),
		onboardingRowCount: list.length,
	};
}

/**
 * POST /ai-recommendations
 */
router.post('/', async (req, res) => {
	const userId = req.user.id;
	const { focus_area, include_history } = req.body;
	const focusKey = normalizeFocusArea(focus_area);

	logger.info(
		`[ai-recommendations] POST user=${userId} focus=${focusKey} (${focusAreaLabel(focusKey)})`,
	);

	const geminiApiKey = process.env.GEMINI_API_KEY;
	if (!geminiApiKey) {
		logger.error('[ai-recommendations] GEMINI_API_KEY is not configured');
		return res.status(503).json({
			error: 'GEMINI_API_KEY is not configured',
		});
	}

	let patientData;
	let recentRecords = [];
	let onboardingRowCount = 0;
	try {
		const [fetched, records] = await Promise.all([
			fetchPatientDataFromSupabase(userId),
			fetchRecentHealthRecords(userId),
		]);
		patientData = fetched.patientData;
		onboardingRowCount = fetched.onboardingRowCount;
		recentRecords = records;
	} catch (error) {
		logger.error(`[ai-recommendations] Error loading patient data: ${error.message}`);
		return res.status(500).json({ error: 'Failed to load patient health data' });
	}

	if (!patientHasHealthSignals(patientData, recentRecords.length, onboardingRowCount)) {
		return res.status(400).json({
			error: 'Insufficient patient data',
			message:
				'Save at least one onboarding step or add a health record in the last 24 hours before requesting AI recommendations.',
		});
	}

	const patientDataText = buildCompactGeminiContext(patientData, recentRecords);

	const focusBlock = getFocusInstructionBlock(focusKey);

	const systemPrompt = `You are PayPill's health education assistant. Use only the patient data provided in the user message. ${AI_SAFETY_FOOTER}`;

	const userPrompt = `${focusBlock}

Selected category (must match all recommendations): "${focusAreaLabel(focusKey)}"

Patient data:
${patientDataText}

Additional context: include_history flag from client = ${Boolean(include_history)}.

Generate exactly 5 personalized recommendations (no more than 5). EVERY recommendation must clearly relate to the selected focus category above. Keep each description concise (under 120 words).

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Recommendation title",
    "description": "Detailed description",
    "priority": "high|medium|low",
    "relatedConditions": ["condition1"],
    "suggestedActions": ["action1"],
    "sources": ["source1"],
    "confidenceScore": 0.85
  }
]`;

	/** Stay below route `maxDuration` (e.g. 300s on Vercel Pro) so we return JSON instead of FUNCTION_INVOCATION_TIMEOUT. */
	const geminiTimeoutMs = Math.min(
		290_000,
		Math.max(60_000, Number(process.env.AI_RECOMMENDATIONS_GEMINI_TIMEOUT_MS) || 260_000),
	);

	let geminiResponse;
	try {
		geminiResponse = await axios.post(
			buildGeminiGenerateContentUrl(geminiApiKey),
			{
				systemInstruction: {
					parts: [{ text: systemPrompt }],
				},
				contents: [
					{
						parts: [{ text: userPrompt }],
					},
				],
				generationConfig: {
					temperature: 0.35,
					maxOutputTokens: 3072,
					topP: 0.95,
					topK: 40,
				},
			},
			{
				headers: { 'Content-Type': 'application/json' },
				timeout: geminiTimeoutMs,
			},
		);
	} catch (err) {
		const isTimeout = err?.code === 'ECONNABORTED' || /timeout/i.test(String(err.message));
		const apiMsg = err.response?.data?.error?.message || err.response?.data?.message;
		logger.error(`[ai-recommendations] Gemini request failed: ${err.message}`, apiMsg || '');
		return res.status(isTimeout ? 504 : 502).json({
			error: isTimeout ? 'AI request timed out' : 'AI provider request failed',
			message: apiMsg || undefined,
		});
	}

	if (geminiResponse.status !== 200) {
		const apiMsg = geminiResponse.data?.error?.message || JSON.stringify(geminiResponse.data || {});
		logger.error(`[ai-recommendations] Gemini HTTP ${geminiResponse.status}: ${apiMsg}`);
		return res.status(502).json({ error: 'AI provider request failed', message: apiMsg });
	}

	const promptFeedback = geminiResponse.data?.promptFeedback;
	if (promptFeedback?.blockReason) {
		logger.warn(`[ai-recommendations] prompt blocked: ${promptFeedback.blockReason}`);
		return res.status(502).json({
			error: 'AI request blocked',
			message: String(promptFeedback.blockReason),
		});
	}

	const responseText = extractGeminiText(geminiResponse.data);
	if (!responseText.trim()) {
		return res.status(502).json({ error: 'Invalid response from AI provider' });
	}

	let recommendations;
	try {
		recommendations = parseRecommendationsJson(responseText);
	} catch (parseError) {
		logger.error(`[ai-recommendations] JSON parse failed: ${parseError.message}`);
		return res.status(502).json({ error: 'Failed to parse AI response' });
	}

	if (!Array.isArray(recommendations)) {
		return res.status(502).json({ error: 'AI response was not a JSON array' });
	}

	const formattedRecommendations = recommendations
		.filter((rec) => rec && rec.title && rec.description)
		.map((rec) => ({
			title: rec.title || '',
			description: rec.description || '',
			priority: rec.priority || 'medium',
			relatedConditions: Array.isArray(rec.relatedConditions) ? rec.relatedConditions : [],
			suggestedActions: Array.isArray(rec.suggestedActions) ? rec.suggestedActions : [],
			sources: Array.isArray(rec.sources) ? rec.sources : [],
			confidenceScore: typeof rec.confidenceScore === 'number' ? rec.confidenceScore : 0.5,
		}))
		.slice(0, 5);

	const sb = getSupabaseAdmin();
	if (formattedRecommendations.length === 0) {
		return res.status(502).json({ error: 'AI returned no usable recommendations' });
	}

	const insertRows = formattedRecommendations.map((rec) => ({
		user_id: userId,
		title: rec.title,
		description: rec.description,
		priority: rec.priority,
		related_conditions: rec.relatedConditions,
		suggested_actions: rec.suggestedActions,
		sources: rec.sources,
		confidence_score: rec.confidenceScore,
	}));

	const { data: insertedRows, error: bulkErr } = await sb
		.from('patient_recommendations')
		.insert(insertRows)
		.select('*');

	if (bulkErr) {
		logger.error(`[ai-recommendations] Bulk insert failed: ${bulkErr.message}`);
		return res.status(500).json({ error: 'Failed to save recommendations', message: bulkErr.message });
	}

	return res.json({
		success: true,
		focus_area: focusKey,
		focus_label: focusAreaLabel(focusKey),
		recent_records_included: recentRecords.length,
		recommendations: insertedRows || [],
		generatedAt: new Date().toISOString(),
	});
});

/**
 * GET /ai-recommendations
 */
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

/**
 * GET /ai-recommendations/:id
 */
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
