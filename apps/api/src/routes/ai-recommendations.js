import 'dotenv/config';
import { Router } from 'express';
import axios from 'axios';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { pocketbaseAuth } from '../middleware/pocketbase-auth.js';

const router = Router();

/**
 * Fetch and compile comprehensive patient data from PocketBase
 */
async function fetchPatientData(userId) {
  logger.info(`[ai-recommendations] Fetching patient data for user: ${userId}`);

  const patientData = {
    userId,
    conditions: [],
    medications: [],
    allergies: [],
    medicalHistory: [],
    labHistory: [],
    lifestyle: {},
    immunizations: [],
    vitals: {},
  };

  try {
    // Fetch patient profile
    logger.info(`[ai-recommendations] Fetching patient_profiles for user: ${userId}`);
    const profiles = await pb.collection('patient_profiles').getFullList({
      filter: `user_id = "${userId}"`,
    });
    if (profiles.length > 0) {
      logger.info(`[ai-recommendations] Found ${profiles.length} patient profile(s)`);
      patientData.profile = profiles[0];
    } else {
      logger.warn(`[ai-recommendations] No patient profile found for user: ${userId}`);
    }
  } catch (error) {
    logger.warn(`[ai-recommendations] Error fetching patient_profiles: ${error.message}`);
  }

  try {
    // Fetch medical conditions
    logger.info(`[ai-recommendations] Fetching patient_medical_conditions for user: ${userId}`);
    const conditions = await pb.collection('patient_medical_conditions').getFullList({
      filter: `userId = "${userId}"`,
    });
    patientData.conditions = conditions.map(c => ({
      name: c.condition_name || c.name,
      status: c.status || 'active',
      diagnosedDate: c.diagnosed_date,
    }));
    logger.info(`[ai-recommendations] Found ${patientData.conditions.length} condition(s)`);
  } catch (error) {
    logger.warn(`[ai-recommendations] Error fetching patient_medical_conditions: ${error.message}`);
  }

  try {
    // Fetch medications
    logger.info(`[ai-recommendations] Fetching patient_medications for user: ${userId}`);
    const medications = await pb.collection('patient_medications').getFullList({
      filter: `userId = "${userId}"`,
    });
    patientData.medications = medications.map(m => ({
      name: m.medication_name || m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      status: m.status || 'active',
      startDate: m.start_date,
    }));
    logger.info(`[ai-recommendations] Found ${patientData.medications.length} medication(s)`);
  } catch (error) {
    logger.warn(`[ai-recommendations] Error fetching patient_medications: ${error.message}`);
  }

  try {
    // Fetch allergies
    logger.info(`[ai-recommendations] Fetching patient_allergies for user: ${userId}`);
    const allergies = await pb.collection('patient_allergies').getFullList({
      filter: `userId = "${userId}"`,
    });
    patientData.allergies = allergies.map(a => ({
      allergen: a.allergen_name || a.name,
      severity: a.severity || 'unknown',
      reaction: a.reaction,
    }));
    logger.info(`[ai-recommendations] Found ${patientData.allergies.length} allergy(ies)`);
  } catch (error) {
    logger.warn(`[ai-recommendations] Error fetching patient_allergies: ${error.message}`);
  }

  try {
    // Fetch medical history
    logger.info(`[ai-recommendations] Fetching patient_medical_history for user: ${userId}`);
    const history = await pb.collection('patient_medical_history').getFullList({
      filter: `userId = "${userId}"`,
    });
    patientData.medicalHistory = history.map(h => ({
      event: h.event_name || h.name,
      date: h.event_date,
      description: h.description,
    }));
    logger.info(`[ai-recommendations] Found ${patientData.medicalHistory.length} history item(s)`);
  } catch (error) {
    logger.warn(`[ai-recommendations] Error fetching patient_medical_history: ${error.message}`);
  }

  try {
    // Fetch lab history
    logger.info(`[ai-recommendations] Fetching patient_lab_history for user: ${userId}`);
    const labHistory = await pb.collection('patient_lab_history').getFullList({
      filter: `userId = "${userId}"`,
      sort: '-test_date',
      limit: 20,
    });
    patientData.labHistory = labHistory.map(l => ({
      testName: l.test_name || l.name,
      result: l.result_value || l.result,
      unit: l.unit,
      referenceRange: l.reference_range,
      testDate: l.test_date,
    }));
    logger.info(`[ai-recommendations] Found ${patientData.labHistory.length} lab result(s)`);
  } catch (error) {
    logger.warn(`[ai-recommendations] Error fetching patient_lab_history: ${error.message}`);
  }

  try {
    // Fetch lifestyle information
    logger.info(`[ai-recommendations] Fetching patient_lifestyle for user: ${userId}`);
    const lifestyle = await pb.collection('patient_lifestyle').getFullList({
      filter: `userId = "${userId}"`,
    });
    if (lifestyle.length > 0) {
      const latestLifestyle = lifestyle[0];
      patientData.lifestyle = {
        smokingStatus: latestLifestyle.smoking_status,
        alcoholConsumption: latestLifestyle.alcohol_consumption,
        exerciseLevel: latestLifestyle.exercise_level,
        sleepQuality: latestLifestyle.sleep_quality,
        diet: latestLifestyle.diet,
        stress: latestLifestyle.stress_level,
      };
      logger.info(`[ai-recommendations] Found lifestyle data`);
    }
  } catch (error) {
    logger.warn(`[ai-recommendations] Error fetching patient_lifestyle: ${error.message}`);
  }

  try {
    // Fetch immunizations
    logger.info(`[ai-recommendations] Fetching patient_immunizations for user: ${userId}`);
    const immunizations = await pb.collection('patient_immunizations').getFullList({
      filter: `userId = "${userId}"`,
    });
    patientData.immunizations = immunizations.map(i => ({
      vaccine: i.vaccine_name || i.name,
      date: i.vaccination_date,
      status: i.status || 'completed',
    }));
    logger.info(`[ai-recommendations] Found ${patientData.immunizations.length} immunization(s)`);
  } catch (error) {
    logger.warn(`[ai-recommendations] Error fetching patient_immunizations: ${error.message}`);
  }

  logger.info(`[ai-recommendations] Patient data compilation complete for user: ${userId}`);
  return patientData;
}

/**
 * Format patient data for Gemini API prompt
 */
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
    patientData.conditions.forEach(c => {
      lines.push(`  - ${c.name} (${c.status})`);
    });
    lines.push('');
  }

  if (patientData.medications.length > 0) {
    lines.push('Current Medications:');
    patientData.medications.forEach(m => {
      lines.push(`  - ${m.name} ${m.dosage} (${m.frequency})`);
    });
    lines.push('');
  }

  if (patientData.allergies.length > 0) {
    lines.push('Allergies:');
    patientData.allergies.forEach(a => {
      lines.push(`  - ${a.allergen} (${a.severity}): ${a.reaction || 'Not specified'}`);
    });
    lines.push('');
  }

  if (patientData.labHistory.length > 0) {
    lines.push('Recent Lab Results:');
    patientData.labHistory.slice(0, 10).forEach(l => {
      lines.push(`  - ${l.testName}: ${l.result} ${l.unit || ''} (${l.testDate})`);
    });
    lines.push('');
  }

  if (patientData.medicalHistory.length > 0) {
    lines.push('Medical History:');
    patientData.medicalHistory.slice(0, 5).forEach(h => {
      lines.push(`  - ${h.event} (${h.date}): ${h.description || 'No details'}`);
    });
    lines.push('');
  }

  if (Object.keys(patientData.lifestyle).length > 0) {
    lines.push('Lifestyle Factors:');
    if (patientData.lifestyle.smokingStatus) lines.push(`  - Smoking: ${patientData.lifestyle.smokingStatus}`);
    if (patientData.lifestyle.alcoholConsumption) lines.push(`  - Alcohol: ${patientData.lifestyle.alcoholConsumption}`);
    if (patientData.lifestyle.exerciseLevel) lines.push(`  - Exercise: ${patientData.lifestyle.exerciseLevel}`);
    if (patientData.lifestyle.sleepQuality) lines.push(`  - Sleep: ${patientData.lifestyle.sleepQuality}`);
    if (patientData.lifestyle.diet) lines.push(`  - Diet: ${patientData.lifestyle.diet}`);
    if (patientData.lifestyle.stress) lines.push(`  - Stress Level: ${patientData.lifestyle.stress}`);
    lines.push('');
  }

  if (patientData.immunizations.length > 0) {
    lines.push('Immunizations:');
    patientData.immunizations.forEach(i => {
      lines.push(`  - ${i.vaccine} (${i.date}): ${i.status}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * POST /ai-recommendations
 * Generate personalized health recommendations using Gemini API
 * Fetches patient data from PocketBase and passes to Gemini
 */
router.post('/', pocketbaseAuth, async (req, res) => {
  const userId = req.pocketbaseUserId;
  const { focus_area, include_history } = req.body;

  logger.info(`[ai-recommendations] POST request from user: ${userId}`);
  logger.info(`[ai-recommendations] Focus area: ${focus_area || 'comprehensive'}`);
  logger.info(`[ai-recommendations] Include history: ${include_history || false}`);

  // Verify GEMINI_API_KEY is configured
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    logger.error('[ai-recommendations] GEMINI_API_KEY is not configured in environment variables');
    throw new Error('GEMINI_API_KEY is not configured. Please set it in .env file.');
  }

  logger.info(`[ai-recommendations] Generating AI recommendations for user ${userId}`);

  // Fetch patient data from PocketBase
  let patientData;
  try {
    patientData = await fetchPatientData(userId);
    logger.info(`[ai-recommendations] Patient data fetched successfully`);
  } catch (error) {
    logger.error(`[ai-recommendations] Error fetching patient data: ${error.message}`);
    throw new Error(`Failed to fetch patient data: ${error.message}`);
  }

  // Verify patient has some health data
  const hasHealthData =
    patientData.conditions.length > 0 ||
    patientData.medications.length > 0 ||
    patientData.allergies.length > 0 ||
    patientData.labHistory.length > 0 ||
    patientData.medicalHistory.length > 0 ||
    Object.keys(patientData.lifestyle).length > 0 ||
    patientData.immunizations.length > 0;

  if (!hasHealthData) {
    logger.warn(`[ai-recommendations] No health data found for user: ${userId}`);
    return res.status(400).json({
      error: 'Insufficient patient data',
      message: 'Patient profile must contain at least one of: conditions, medications, allergies, lab results, medical history, lifestyle information, or immunizations',
    });
  }

  // Format patient data for Gemini API
  const patientDataText = formatPatientDataForPrompt(patientData);
  logger.debug(`[ai-recommendations] Formatted patient data:\n${patientDataText}`);

  // Build system prompt
  const systemPrompt = `You are a healthcare AI assistant for PayPill specializing in personalized health insights and recommendations. You have access to the user's complete health profile including conditions, medications, vitals, lifestyle, and family history. Your role is to: (1) Analyze medication interactions and safety concerns, (2) Recommend generic alternatives for current medications with cost savings estimates, (3) Suggest preventive care based on conditions, age, and risk factors, (4) Provide lifestyle and wellness recommendations based on health data, (5) Identify medication adherence issues and suggest solutions, (6) Recommend nearby healthcare providers (pharmacists, physiotherapists, specialists) based on user's conditions and location, (7) Provide evidence-based clinical guidance referencing current research and guidelines. Additionally, analyze user health data including: health profile, current medications, pre-existing conditions, lifestyle habits, health goals, and vital signs trends. Generate personalized, actionable health recommendations in categories: medication management, preventive care, lifestyle changes, lab tests, specialist referrals, vaccinations, and health screenings. Provide evidence-based insights with clear reasoning. Format recommendations clearly with priority levels (high/medium/low) and actionable next steps. Always prioritize patient safety, be empathetic, and recommend consulting healthcare providers for major decisions.`;

  const userPrompt = `Analyze this patient's health profile and generate personalized health recommendations:\n\n${patientDataText}\n\nFocus Area: ${focus_area || 'comprehensive'}\nInclude History: ${include_history || false}\n\nGenerate 5-10 personalized health recommendations. Return ONLY a valid JSON array with this structure:\n[\n  {\n    "title": "Recommendation title",\n    "description": "Detailed description",\n    "priority": "high|medium|low",\n    "relatedConditions": ["condition1"],\n    "suggestedActions": ["action1"],\n    "sources": ["source1"],\n    "confidenceScore": 0.85\n  }\n]`;

  // Call Gemini API
  logger.info('[ai-recommendations] Calling Gemini API');
  const geminiResponse = await axios.post(
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
    }
  );

  if (!geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
    logger.error('[ai-recommendations] Invalid response from Gemini API: missing content');
    throw new Error('Invalid response from Gemini API: missing content');
  }

  const responseText = geminiResponse.data.candidates[0].content.parts[0].text;
  logger.info('[ai-recommendations] Gemini API response received');
  logger.debug(`[ai-recommendations] Response preview: ${responseText.substring(0, 200)}...`);

  // Parse recommendations from response
  let recommendations = [];
  try {
    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : responseText;
    recommendations = JSON.parse(jsonString);
    logger.info(`[ai-recommendations] Parsed ${recommendations.length} recommendations from Gemini response`);
  } catch (parseError) {
    logger.error(`[ai-recommendations] Failed to parse Gemini response as JSON: ${parseError.message}`);
    throw new Error('Failed to parse recommendations from Gemini API response');
  }

  // Validate and format recommendations
  const formattedRecommendations = recommendations
    .filter(rec => rec && rec.title && rec.description)
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

  logger.info(`[ai-recommendations] Generated ${formattedRecommendations.length} formatted recommendations for user ${userId}`);

  res.json({
    success: true,
    recommendations: formattedRecommendations,
    generatedAt: new Date().toISOString(),
  });
});

/**
 * GET /ai-recommendations
 * Fetch all recommendations for authenticated user
 */
router.get('/', pocketbaseAuth, async (req, res) => {
  const userId = req.pocketbaseUserId;

  logger.info(`[ai-recommendations] GET request from user: ${userId}`);

  const recommendations = await pb.collection('patient_recommendations').getList(1, 100, {
    filter: `user_id="${userId}"`,
    sort: '-created',
  });

  logger.info(`[ai-recommendations] Fetched ${recommendations.items.length} recommendations for user ${userId}`);

  res.json(recommendations.items);
});

/**
 * GET /ai-recommendations/:id
 * Fetch a specific recommendation by ID
 */
router.get('/:id', pocketbaseAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.pocketbaseUserId;

  logger.info(`[ai-recommendations] GET request for recommendation ${id} from user ${userId}`);

  const recommendation = await pb.collection('patient_recommendations').getOne(id);

  // Verify the recommendation belongs to the authenticated user
  if (recommendation.user_id !== userId) {
    logger.warn(`[ai-recommendations] Unauthorized access attempt: user ${userId} tried to access recommendation ${id}`);
    throw new Error('Unauthorized');
  }

  logger.info(`[ai-recommendations] Retrieved recommendation ${id}`);

  res.json(recommendation);
});

export default router;