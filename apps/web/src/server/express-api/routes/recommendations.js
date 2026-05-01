import 'dotenv/config';
import { Router } from 'express';
import axios from 'axios';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { pocketbaseAuth } from '../middleware/pocketbase-auth.js';
import { preparePatientDataForAnalysis, formatHealthDataForPrompt } from '../utils/healthDataAnalyzer.js';

const router = Router();

/**
 * POST /ai-recommendations
 * Generate personalized health recommendations using Gemini API
 */
router.post('/', pocketbaseAuth, async (req, res) => {
  const { patient_id, focus_area, include_history } = req.body;

  // Validate required fields
  if (!patient_id) {
    return res.status(400).json({
      error: 'Missing required field: patient_id',
    });
  }

  // Verify patient_id matches authenticated user
  if (patient_id !== req.pocketbaseUserId) {
    throw new Error('Unauthorized: patient_id does not match authenticated user');
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  logger.info(`Generating AI recommendations for patient ${patient_id}`);

  // Prepare patient health data
  const healthData = await preparePatientDataForAnalysis(patient_id);
  const healthDataText = formatHealthDataForPrompt(healthData);

  // Build system prompt focused on HIPAA compliance and medical accuracy
  const systemPrompt = `You are a HIPAA-compliant healthcare AI assistant specializing in personalized health recommendations. 
Your role is to analyze patient health data and provide evidence-based, actionable recommendations.

IMPORTANT GUIDELINES:
1. All recommendations must be based on current medical evidence and guidelines
2. Prioritize patient safety and privacy
3. Recommend consulting healthcare providers for major decisions
4. Provide clear reasoning for each recommendation
5. Include confidence scores based on evidence strength
6. Format recommendations as structured JSON

Generate 5-10 personalized health recommendations based on the patient's complete health profile.`;

  const userPrompt = `${systemPrompt}

Patient Health Data:
${healthDataText}

Focus Area: ${focus_area || 'comprehensive'}
Include History: ${include_history || false}

Generate personalized health recommendations. Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Recommendation title",
    "description": "Detailed description of the recommendation",
    "priority": "high|medium|low",
    "category": "medication|lifestyle|preventive|specialist|lab|vaccination|screening",
    "related_conditions": ["condition1", "condition2"],
    "suggested_actions": ["action1", "action2"],
    "timeline": "immediate|1-2 weeks|1-3 months|ongoing",
    "sources": ["source1", "source2"],
    "confidence_score": 0.85,
    "risk_if_ignored": "Description of potential risks"
  }
]

Ensure all recommendations are medically accurate and patient-specific.`;

  // Call Gemini API with timeout
  let geminiResponse;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: userPrompt,
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Gemini API request timeout (30 seconds)');
    }
    throw new Error(`Gemini API error: ${error.message}`);
  }

  if (!geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid response from Gemini API: missing content');
  }

  const responseText = geminiResponse.data.candidates[0].content.parts[0].text;

  // Parse recommendations from response
  let recommendations = [];
  try {
    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : responseText;
    recommendations = JSON.parse(jsonString);
  } catch (parseError) {
    logger.warn(`Failed to parse Gemini response as JSON: ${parseError.message}`);
    throw new Error('Failed to parse recommendations from Gemini API response');
  }

  // Validate and format recommendations
  const formattedRecommendations = recommendations
    .filter((rec) => rec && rec.title && rec.description)
    .map((rec, index) => ({
      id: `rec_${patient_id}_${Date.now()}_${index}`,
      user_id: patient_id,
      title: rec.title || '',
      description: rec.description || '',
      priority: rec.priority || 'medium',
      category: rec.category || 'general',
      related_conditions: Array.isArray(rec.related_conditions) ? rec.related_conditions : [],
      suggested_actions: Array.isArray(rec.suggested_actions) ? rec.suggested_actions : [],
      timeline: rec.timeline || 'ongoing',
      sources: Array.isArray(rec.sources) ? rec.sources : [],
      confidence_score: typeof rec.confidence_score === 'number' ? rec.confidence_score : 0.5,
      risk_if_ignored: rec.risk_if_ignored || '',
      status: 'Pending',
      created_at: new Date().toISOString(),
    }));

  // Save recommendations to PocketBase
  const savedRecommendations = [];
  for (const rec of formattedRecommendations) {
    try {
      const saved = await pb.collection('patient_recommendations').create(rec);
      savedRecommendations.push(saved);
    } catch (error) {
      logger.warn(`Failed to save recommendation: ${error.message}`);
    }
  }

  // Create recommendation request record
  try {
    await pb.collection('recommendation_requests').create({
      user_id: patient_id,
      focus_area: focus_area || 'comprehensive',
      include_history: include_history || false,
      count: savedRecommendations.length,
      status: 'completed',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn(`Failed to create recommendation request record: ${error.message}`);
  }

  logger.info(`Generated and saved ${savedRecommendations.length} recommendations for patient ${patient_id}`);

  res.json({
    success: true,
    recommendations: savedRecommendations,
    count: savedRecommendations.length,
  });
});

/**
 * GET /ai-recommendations
 * Fetch recommendations for authenticated user
 */
router.get('/', pocketbaseAuth, async (req, res) => {
  const { status, category } = req.query;
  const patientId = req.pocketbaseUserId;

  const filters = [`user_id = "${patientId}"`];

  if (status) {
    filters.push(`status = "${status}"`);
  }

  if (category) {
    filters.push(`category = "${category}"`);
  }

  const filter = filters.join(' && ');

  const recommendations = await pb.collection('patient_recommendations').getFullList({
    filter,
    sort: '-created_at',
  });

  logger.info(`Fetched ${recommendations.length} recommendations for patient ${patientId}`);

  res.json(recommendations);
});

/**
 * GET /ai-recommendations/:id
 * Fetch single recommendation
 */
router.get('/:id', pocketbaseAuth, async (req, res) => {
  const { id } = req.params;
  const patientId = req.pocketbaseUserId;

  const recommendation = await pb.collection('patient_recommendations').getOne(id);

  // Verify recommendation belongs to authenticated user
  if (recommendation.user_id !== patientId) {
    throw new Error('Unauthorized: recommendation does not belong to authenticated user');
  }

  logger.info(`Fetched recommendation ${id} for patient ${patientId}`);

  res.json(recommendation);
});

/**
 * PUT /ai-recommendations/:id
 * Update recommendation status and notes
 */
router.put('/:id', pocketbaseAuth, async (req, res) => {
  const { id } = req.params;
  const { status, user_notes, refined_actions } = req.body;
  const patientId = req.pocketbaseUserId;

  const recommendation = await pb.collection('patient_recommendations').getOne(id);

  // Verify recommendation belongs to authenticated user
  if (recommendation.user_id !== patientId) {
    throw new Error('Unauthorized: recommendation does not belong to authenticated user');
  }

  // Prepare update data
  const updateData = {};
  if (status) updateData.status = status;
  if (user_notes) updateData.user_notes = user_notes;
  if (refined_actions) updateData.refined_actions = refined_actions;

  // Set accepted_at if status is Accepted
  if (status === 'Accepted') {
    updateData.accepted_at = new Date().toISOString();
  }

  // Update recommendation
  const updatedRecommendation = await pb.collection('patient_recommendations').update(id, updateData);

  // Create history record
  try {
    await pb.collection('recommendation_history').create({
      user_id: patientId,
      recommendation_id: id,
      action: status || 'Updated',
      notes: user_notes || '',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn(`Failed to create recommendation history: ${error.message}`);
  }

  logger.info(`Updated recommendation ${id} for patient ${patientId}`);

  res.json(updatedRecommendation);
});

/**
 * POST /ai-recommendations/:id/accept
 * Accept a recommendation
 */
router.post('/:id/accept', pocketbaseAuth, async (req, res) => {
  const { id } = req.params;
  const patientId = req.pocketbaseUserId;

  const recommendation = await pb.collection('patient_recommendations').getOne(id);

  // Verify recommendation belongs to authenticated user
  if (recommendation.user_id !== patientId) {
    throw new Error('Unauthorized: recommendation does not belong to authenticated user');
  }

  const acceptedAt = new Date().toISOString();

  // Update recommendation
  await pb.collection('patient_recommendations').update(id, {
    status: 'Accepted',
    accepted_at: acceptedAt,
  });

  // Create history record
  try {
    await pb.collection('recommendation_history').create({
      user_id: patientId,
      recommendation_id: id,
      action: 'Accepted',
      created_at: acceptedAt,
    });
  } catch (error) {
    logger.warn(`Failed to create recommendation history: ${error.message}`);
  }

  logger.info(`Recommendation ${id} accepted by patient ${patientId}`);

  res.json({
    success: true,
    message: 'Recommendation accepted',
  });
});

/**
 * POST /ai-recommendations/:id/decline
 * Decline a recommendation
 */
router.post('/:id/decline', pocketbaseAuth, async (req, res) => {
  const { id } = req.params;
  const { reason, notes } = req.body;
  const patientId = req.pocketbaseUserId;

  const recommendation = await pb.collection('patient_recommendations').getOne(id);

  // Verify recommendation belongs to authenticated user
  if (recommendation.user_id !== patientId) {
    throw new Error('Unauthorized: recommendation does not belong to authenticated user');
  }

  const declinedAt = new Date().toISOString();

  // Update recommendation
  await pb.collection('patient_recommendations').update(id, {
    status: 'Declined',
    declined_at: declinedAt,
    decline_reason: reason || '',
  });

  // Create history record
  try {
    await pb.collection('recommendation_history').create({
      user_id: patientId,
      recommendation_id: id,
      action: 'Declined',
      notes: notes || reason || '',
      created_at: declinedAt,
    });
  } catch (error) {
    logger.warn(`Failed to create recommendation history: ${error.message}`);
  }

  logger.info(`Recommendation ${id} declined by patient ${patientId}`);

  res.json({
    success: true,
    message: 'Recommendation declined',
  });
});

/**
 * POST /ai-recommendations/:id/refine
 * Refine a recommendation with user input
 */
router.post('/:id/refine', pocketbaseAuth, async (req, res) => {
  const { id } = req.params;
  const { refined_actions, user_notes } = req.body;
  const patientId = req.pocketbaseUserId;

  if (!refined_actions || !Array.isArray(refined_actions)) {
    return res.status(400).json({
      error: 'Missing required field: refined_actions (must be an array)',
    });
  }

  if (!user_notes) {
    return res.status(400).json({
      error: 'Missing required field: user_notes',
    });
  }

  const recommendation = await pb.collection('patient_recommendations').getOne(id);

  // Verify recommendation belongs to authenticated user
  if (recommendation.user_id !== patientId) {
    throw new Error('Unauthorized: recommendation does not belong to authenticated user');
  }

  const refinedAt = new Date().toISOString();

  // Update recommendation
  const updatedRecommendation = await pb.collection('patient_recommendations').update(id, {
    status: 'Refined',
    refined_actions,
    user_notes,
    refined_at: refinedAt,
  });

  // Create history record
  try {
    await pb.collection('recommendation_history').create({
      user_id: patientId,
      recommendation_id: id,
      action: 'Refined',
      notes: user_notes,
      created_at: refinedAt,
    });
  } catch (error) {
    logger.warn(`Failed to create recommendation history: ${error.message}`);
  }

  logger.info(`Recommendation ${id} refined by patient ${patientId}`);

  res.json(updatedRecommendation);
});

/**
 * GET /recommendation-history
 * Fetch recommendation history and statistics
 */
router.get('/history/timeline', pocketbaseAuth, async (req, res) => {
  const { start_date, end_date, type } = req.query;
  const patientId = req.pocketbaseUserId;

  const filters = [`user_id = "${patientId}"`];

  if (start_date) {
    filters.push(`created_at >= "${start_date}"`);
  }

  if (end_date) {
    filters.push(`created_at <= "${end_date}"`);
  }

  const filter = filters.join(' && ');

  // Fetch recommendation requests
  const requests = await pb.collection('recommendation_requests').getFullList({
    filter,
    sort: '-created_at',
  });

  // Fetch recommendation history
  const history = await pb.collection('recommendation_history').getFullList({
    filter,
    sort: '-created_at',
  });

  // Calculate statistics
  const stats = {
    total_generated: requests.reduce((sum, req) => sum + (req.count || 0), 0),
    total_accepted: history.filter((h) => h.action === 'Accepted').length,
    total_declined: history.filter((h) => h.action === 'Declined').length,
    total_refined: history.filter((h) => h.action === 'Refined').length,
    total_archived: history.filter((h) => h.action === 'Archived').length,
  };

  // Calculate average confidence score
  const recommendations = await pb.collection('patient_recommendations').getFullList({
    filter: `user_id = "${patientId}"`,
  });

  const avgConfidence =
    recommendations.length > 0
      ? recommendations.reduce((sum, rec) => sum + (rec.confidence_score || 0), 0) / recommendations.length
      : 0;

  stats.avg_confidence_score = parseFloat(avgConfidence.toFixed(2));

  logger.info(`Fetched recommendation history for patient ${patientId}`);

  res.json({
    timeline: requests.map((req) => ({
      date: req.created_at,
      type: 'Initial',
      focus_area: req.focus_area,
      count: req.count,
      status: req.status,
    })),
    history,
    statistics: stats,
  });
});

export default router;