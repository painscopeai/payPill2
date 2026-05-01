import 'dotenv/config';
import { Router } from 'express';
import axios from 'axios';
import logger from '../utils/logger.js';
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import {
	buildPatientDataFromOnboardingRows,
	patientHasHealthSignals,
} from '../utils/patientHealthFromOnboarding.js';

const router = Router();

router.use(requireSupabaseUser);

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

	return buildPatientDataFromOnboardingRows(userId, rows || []);
}

function formatPatientDataForPrompt(patientData) {
	const lines = [];

	lines.push('=== PATIENT HEALTH PROFILE ===');
	lines.push('');

	if (patientData.profile) {
		if (patientData.profile.age) lines.push(`Age: ${patientData.profile.age}`);
		if (patientData.profile.gender) lines.push(`Gender: ${patientData.profile.gender}`);
		lines.push('');
	}

	if (patientData.conditions.length > 0) {
		lines.push('Current Medical Conditions:');
		patientData.conditions.forEach((c) => {
			lines.push(`  - ${c.name} (${c.status})`);
		});
		lines.push('');
	}

	if (patientData.medications.length > 0) {
		lines.push('Current Medications:');
		patientData.medications.forEach((m) => {
			lines.push(`  - ${m.name} ${m.dosage || ''} (${m.frequency || 'as directed'})`);
		});
		lines.push('');
	}

	if (patientData.allergies.length > 0) {
		lines.push('Allergies:');
		patientData.allergies.forEach((a) => {
			lines.push(`  - ${a.allergen} (${a.severity}): ${a.reaction || 'Not specified'}`);
		});
		lines.push('');
	}

	if (patientData.labHistory.length > 0) {
		lines.push('Recent Lab Results:');
		patientData.labHistory.slice(0, 10).forEach((l) => {
			lines.push(`  - ${l.testName}: ${l.result} ${l.unit || ''} (${l.testDate})`);
		});
		lines.push('');
	}

	if (patientData.medicalHistory.length > 0) {
		lines.push('Medical History:');
		patientData.medicalHistory.slice(0, 5).forEach((h) => {
			lines.push(`  - ${h.event} (${h.date}): ${h.description || 'No details'}`);
		});
		lines.push('');
	}

	if (Object.keys(patientData.lifestyle || {}).length > 0) {
		const L = patientData.lifestyle;
		lines.push('Lifestyle Factors:');
		if (L.smokingStatus) lines.push(`  - Smoking: ${L.smokingStatus}`);
		if (L.alcoholConsumption) lines.push(`  - Alcohol: ${L.alcoholConsumption}`);
		if (L.exerciseLevel) lines.push(`  - Exercise: ${L.exerciseLevel}`);
		if (L.sleepQuality) lines.push(`  - Sleep: ${L.sleepQuality}`);
		if (L.diet) lines.push(`  - Diet: ${L.diet}`);
		if (L.stress) lines.push(`  - Stress Level: ${L.stress}`);
		lines.push('');
	}

	if (patientData.immunizations.length > 0) {
		lines.push('Immunizations:');
		patientData.immunizations.forEach((i) => {
			lines.push(`  - ${i.vaccine} (${i.date}): ${i.status}`);
		});
		lines.push('');
	}

	if (patientData.vitals && Object.keys(patientData.vitals).length > 0) {
		lines.push('Vital signs & measurements:');
		lines.push(JSON.stringify(patientData.vitals));
		lines.push('');
	}

	if (patientData.rawOnboardingSummary) {
		lines.push('=== Onboarding questionnaire (detailed) ===');
		lines.push(patientData.rawOnboardingSummary);
		lines.push('');
	}

	return lines.join('\n');
}

/**
 * POST /ai-recommendations
 */
router.post('/', async (req, res) => {
	const userId = req.user.id;
	const { focus_area, include_history } = req.body;

	logger.info(`[ai-recommendations] POST request from user: ${userId}`);

	const geminiApiKey = process.env.GEMINI_API_KEY;
	if (!geminiApiKey) {
		logger.error('[ai-recommendations] GEMINI_API_KEY is not configured');
		return res.status(503).json({
			error: 'GEMINI_API_KEY is not configured',
		});
	}

	let patientData;
	try {
		patientData = await fetchPatientDataFromSupabase(userId);
	} catch (error) {
		logger.error(`[ai-recommendations] Error loading onboarding data: ${error.message}`);
		return res.status(500).json({ error: 'Failed to load patient health data' });
	}

	if (!patientHasHealthSignals(patientData)) {
		return res.status(400).json({
			error: 'Insufficient patient data',
			message:
				'Complete onboarding or add health information before requesting AI recommendations.',
		});
	}

	const patientDataText = formatPatientDataForPrompt(patientData);

	const systemPrompt = `You are a healthcare AI assistant for PayPill specializing in personalized health insights and recommendations. You have access to the user's complete health profile including conditions, medications, vitals, lifestyle, and family history. Your role is to: (1) Analyze medication interactions and safety concerns, (2) Recommend generic alternatives for current medications with cost savings estimates, (3) Suggest preventive care based on conditions, age, and risk factors, (4) Provide lifestyle and wellness recommendations based on health data, (5) Identify medication adherence issues and suggest solutions, (6) Recommend nearby healthcare providers (pharmacists, physiotherapists, specialists) based on user's conditions and location, (7) Provide evidence-based clinical guidance referencing current research and guidelines. Additionally, analyze user health data including: health profile, current medications, pre-existing conditions, lifestyle habits, health goals, and vital signs trends. Generate personalized, actionable health recommendations in categories: medication management, preventive care, lifestyle changes, lab tests, specialist referrals, vaccinations, and health screenings. Provide evidence-based insights with clear reasoning. Format recommendations clearly with priority levels (high/medium/low) and actionable next steps. Always prioritize patient safety, be empathetic, and recommend consulting healthcare providers for major decisions.`;

	const userPrompt = `Analyze this patient's health profile and generate personalized health recommendations:\n\n${patientDataText}\n\nFocus Area: ${focus_area || 'comprehensive'}\nInclude History: ${include_history || false}\n\nGenerate 5-10 personalized health recommendations. Return ONLY a valid JSON array with this structure:\n[\n  {\n    "title": "Recommendation title",\n    "description": "Detailed description",\n    "priority": "high|medium|low",\n    "relatedConditions": ["condition1"],\n    "suggestedActions": ["action1"],\n    "sources": ["source1"],\n    "confidenceScore": 0.85\n  }\n]`;

	let geminiResponse;
	try {
		geminiResponse = await axios.post(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
			{
				contents: [
					{
						parts: [{ text: userPrompt }],
					},
				],
			},
			{ headers: { 'Content-Type': 'application/json' } },
		);
	} catch (err) {
		logger.error(`[ai-recommendations] Gemini request failed: ${err.message}`);
		return res.status(502).json({ error: 'AI provider request failed' });
	}

	if (!geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
		return res.status(502).json({ error: 'Invalid response from AI provider' });
	}

	const responseText = geminiResponse.data.candidates[0].content.parts[0].text;

	let recommendations = [];
	try {
		const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
		const jsonString = jsonMatch ? jsonMatch[0] : responseText;
		recommendations = JSON.parse(jsonString);
	} catch (parseError) {
		logger.error(`[ai-recommendations] JSON parse failed: ${parseError.message}`);
		return res.status(502).json({ error: 'Failed to parse AI response' });
	}

	const formattedRecommendations = recommendations
		.filter((rec) => rec && rec.title && rec.description)
		.map((rec, index) => ({
			id: `rec_${userId}_${Date.now()}_${index}`,
			title: rec.title || '',
			description: rec.description || '',
			priority: rec.priority || 'medium',
			relatedConditions: Array.isArray(rec.relatedConditions) ? rec.relatedConditions : [],
			suggestedActions: Array.isArray(rec.suggestedActions) ? rec.suggestedActions : [],
			sources: Array.isArray(rec.sources) ? rec.sources : [],
			confidenceScore: typeof rec.confidenceScore === 'number' ? rec.confidenceScore : 0.5,
		}));

	const sb = getSupabaseAdmin();
	for (const rec of formattedRecommendations) {
		const { error: insErr } = await sb.from('patient_recommendations').insert({
			user_id: userId,
			title: rec.title,
			description: rec.description,
			priority: rec.priority,
			related_conditions: rec.relatedConditions,
			suggested_actions: rec.suggestedActions,
			sources: rec.sources,
			confidence_score: rec.confidenceScore,
		});
		if (insErr) {
			logger.warn(`[ai-recommendations] Could not persist recommendation: ${insErr.message}`);
		}
	}

	return res.json({
		success: true,
		recommendations: formattedRecommendations,
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

/** Legacy UI actions — persist status in a later iteration */
router.post('/:id/accept', async (req, res) => {
	return res.json({ success: true });
});

router.post('/:id/decline', async (req, res) => {
	return res.json({ success: true });
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
