import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { validateStep, validateAllSteps } from '../utils/validation.js';
import { pocketbaseAuth } from '../middleware/pocketbase-auth.js';

const router = Router();

// Apply pocketbaseAuth middleware to all onboarding routes
router.use(pocketbaseAuth);

/**
 * POST /onboarding/save-step
 * Save a single onboarding step
 */
router.post('/save-step', async (req, res) => {
  const { step, data } = req.body;

  // DEBUG LOGGING: Log authentication and request data
  logger.info('=== ONBOARDING SAVE-STEP DEBUG ===');
  logger.info(`req.user object: ${JSON.stringify(req.user)}`);
  logger.info(`req.user.id type: ${typeof req.user?.id}`);
  logger.info(`req.pocketbaseUserId: ${req.pocketbaseUserId}`);
  logger.info(`req.body.patient_id: ${req.body.patient_id}`);
  logger.info(`req.body.patient_id type: ${typeof req.body.patient_id}`);

  // Validate authentication - middleware should have already set req.user
  if (!req.user || !req.user.id) {
    logger.error('CRITICAL: Authentication middleware failed to set req.user');
    logger.error(`req.user: ${JSON.stringify(req.user)}`);
    logger.error(`req.pocketbaseUserId: ${req.pocketbaseUserId}`);
    return res.status(401).json({
      error: 'Authentication failed: user not found in request',
      debug: {
        hasUser: !!req.user,
        hasUserId: !!req.user?.id,
        pocketbaseUserId: req.pocketbaseUserId,
      },
    });
  }

  // Use authenticated user ID directly (more secure, prevents ID spoofing)
  const patientId = req.user.id;
  logger.info(`Using patientId from authenticated session: ${patientId}`);

  // Validate required fields
  if (step === undefined || step === null) {
    return res.status(400).json({
      error: 'Missing required field: step',
    });
  }

  if (!data || typeof data !== 'object') {
    return res.status(400).json({
      error: 'Missing required field: data (must be an object)',
    });
  }

  // Validate step number
  const stepNum = parseInt(step);
  if (isNaN(stepNum) || stepNum < 1 || stepNum > 13) {
    return res.status(400).json({
      error: 'Invalid step number. Must be between 1 and 13.',
    });
  }

  // Validate step data
  const validation = validateStep(stepNum, data);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Validation failed',
      fields: validation.errors,
    });
  }

  // Determine collection based on step
  const collectionMap = {
    1: 'patient_profiles',
    2: 'patient_profiles',
    3: 'insurance_information',
    4: 'medical_conditions',
    5: 'current_medications',
    6: 'allergies',
    7: 'family_medical_history',
    8: 'lifestyle_information',
    9: 'vital_signs',
    10: 'health_goals',
    11: 'pharmacy_preferences',
    12: 'healthcare_providers',
    13: 'onboarding_confirmation',
  };

  const collection = collectionMap[stepNum];

  // Prepare data for saving
  const saveData = {
    user_id: patientId,
    step: stepNum,
    ...data,
    updated_at: new Date().toISOString(),
  };

  // Check if record exists for this step
  let existingRecord = null;
  try {
    existingRecord = await pb
      .collection(collection)
      .getFirstListItem(`user_id = "${patientId}" && step = ${stepNum}`)
      .catch(() => null);
  } catch (error) {
    logger.warn(`Error checking existing record: ${error.message}`);
  }

  let savedRecord;
  if (existingRecord) {
    // Update existing record
    savedRecord = await pb.collection(collection).update(existingRecord.id, saveData);
    logger.info(`Onboarding step ${stepNum} updated for patient ${patientId}`);
  } else {
    // Create new record
    savedRecord = await pb.collection(collection).create(saveData);
    logger.info(`Onboarding step ${stepNum} created for patient ${patientId}`);
  }

  res.json({
    success: true,
    step: stepNum,
    message: `Step ${stepNum} saved successfully`,
    record_id: savedRecord.id,
  });
});

/**
 * GET /onboarding/progress
 * Fetch onboarding progress for authenticated user
 */
router.get('/progress', async (req, res) => {
  // Validate authentication - middleware should have already set req.user
  if (!req.user || !req.user.id) {
    logger.error('CRITICAL: Authentication middleware failed to set req.user in GET /progress');
    logger.error(`req.user: ${JSON.stringify(req.user)}`);
    logger.error(`req.pocketbaseUserId: ${req.pocketbaseUserId}`);
    return res.status(401).json({
      error: 'Authentication failed: user not found in request',
      debug: {
        hasUser: !!req.user,
        hasUserId: !!req.user?.id,
        pocketbaseUserId: req.pocketbaseUserId,
      },
    });
  }

  const patientId = req.user.id;
  logger.info(`Fetching onboarding progress for patient ${patientId}`);

  const collectionMap = {
    1: 'patient_profiles',
    2: 'patient_profiles',
    3: 'insurance_information',
    4: 'medical_conditions',
    5: 'current_medications',
    6: 'allergies',
    7: 'family_medical_history',
    8: 'lifestyle_information',
    9: 'vital_signs',
    10: 'health_goals',
    11: 'pharmacy_preferences',
    12: 'healthcare_providers',
    13: 'onboarding_confirmation',
  };

  const formData = {};
  const completedSteps = [];
  let lastSaved = null;

  // Fetch data from all collections
  for (const [step, collection] of Object.entries(collectionMap)) {
    try {
      const records = await pb.collection(collection).getFullList({
        filter: `user_id = "${patientId}"`,
      });

      if (records.length > 0) {
        const record = records[0];
        completedSteps.push(parseInt(step));
        formData[`step_${step}`] = record;

        // Track latest saved timestamp
        if (record.updated_at) {
          const recordTime = new Date(record.updated_at).getTime();
          if (!lastSaved || recordTime > new Date(lastSaved).getTime()) {
            lastSaved = record.updated_at;
          }
        }
      }
    } catch (error) {
      logger.warn(`Error fetching step ${step} data: ${error.message}`);
    }
  }

  // Determine current step (next incomplete step)
  let currentStep = 1;
  for (let i = 1; i <= 13; i++) {
    if (!completedSteps.includes(i)) {
      currentStep = i;
      break;
    }
  }

  logger.info(`Fetched onboarding progress for patient ${patientId}: current step ${currentStep}, completed steps: ${completedSteps.join(', ')}`);

  res.json({
    currentStep,
    completedSteps: completedSteps.sort((a, b) => a - b),
    formData,
    lastSaved: lastSaved || null,
  });
});

/**
 * POST /onboarding/complete
 * Complete onboarding and trigger AI recommendations
 */
router.post('/complete', async (req, res) => {
  const { allData } = req.body;

  // Validate authentication - middleware should have already set req.user
  if (!req.user || !req.user.id) {
    logger.error('CRITICAL: Authentication middleware failed to set req.user in POST /complete');
    logger.error(`req.user: ${JSON.stringify(req.user)}`);
    logger.error(`req.pocketbaseUserId: ${req.pocketbaseUserId}`);
    return res.status(401).json({
      error: 'Authentication failed: user not found in request',
      debug: {
        hasUser: !!req.user,
        hasUserId: !!req.user?.id,
        pocketbaseUserId: req.pocketbaseUserId,
      },
    });
  }

  const patientId = req.user.id;
  logger.info(`Completing onboarding for patient ${patientId}`);

  if (!allData || typeof allData !== 'object') {
    return res.status(400).json({
      error: 'Missing required field: allData (must be an object)',
    });
  }

  // Validate all steps
  const validation = validateAllSteps(allData);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Validation failed for one or more steps',
      errors: validation.errors,
    });
  }

  // Update user record to mark onboarding as completed
  const completedAt = new Date().toISOString();
  await pb.collection('users').update(patientId, {
    onboarding_completed: true,
    onboarding_completed_at: completedAt,
  });

  logger.info(`Onboarding completed for patient ${patientId}`);

  // Trigger AI recommendation generation
  let recommendationsGenerated = 0;
  try {
    // Call internal AI recommendations endpoint
    const authToken = req.headers.authorization;
    const recommendationResponse = await fetch(
      `http://localhost:3001/hcgi/api/ai-recommendations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken || '',
        },
        body: JSON.stringify({
          patient_id: patientId,
          focus_area: 'comprehensive',
          include_history: false,
        }),
      }
    );

    if (recommendationResponse.ok) {
      const recommendationData = await recommendationResponse.json();
      recommendationsGenerated = recommendationData.count || 0;
      logger.info(`Generated ${recommendationsGenerated} recommendations for patient ${patientId}`);
    } else {
      logger.warn(`Failed to generate recommendations: ${recommendationResponse.status}`);
    }
  } catch (error) {
    logger.warn(`Failed to generate AI recommendations: ${error.message}`);
  }

  res.json({
    success: true,
    message: 'Onboarding completed successfully',
    recommendations_generated: recommendationsGenerated,
    completed_at: completedAt,
  });
});

export default router;