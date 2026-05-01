import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { pocketbaseAuth } from '../middleware/pocketbase-auth.js';

const router = Router();

router.use(pocketbaseAuth);

/**
 * GET /provider/patients
 * Fetch patients for authenticated provider
 */
router.get('/patients', async (req, res) => {
  const providerId = req.pocketbaseUserId;

  // Fetch patient-provider relationships
  const relationships = await pb.collection('patient_provider_relationships').getFullList({
    filter: `provider_id = "${providerId}"`,
  });

  // Populate patient details
  const patientsWithDetails = await Promise.all(
    relationships.map(async (relationship) => {
      try {
        const user = await pb.collection('users').getOne(relationship.patient_id);
        const healthProfile = await pb.collection('health_profile')
          .getFirstListItem(`user_id = "${relationship.patient_id}"`)
          .catch(() => null);

        return {
          ...relationship,
          patient_details: user,
          health_summary: healthProfile || {},
        };
      } catch (error) {
        logger.warn(`Failed to fetch patient details for ${relationship.patient_id}:`, error.message);
        return relationship;
      }
    })
  );

  logger.info(`Fetched ${patientsWithDetails.length} patients for provider ${providerId}`);

  res.json(patientsWithDetails);
});

/**
 * PUT /provider/patients/:id
 * Update patient health profile and create clinical notes
 */
router.put('/patients/:id', async (req, res) => {
  const { id } = req.params;
  const { treatment_plan, notes } = req.body;
  const providerId = req.pocketbaseUserId;

  // Verify provider has access to this patient
  const relationship = await pb.collection('patient_provider_relationships')
    .getFirstListItem(`provider_id = "${providerId}" && patient_id = "${id}"`)
    .catch(() => null);

  if (!relationship) {
    return res.status(403).json({
      error: 'You do not have access to this patient',
    });
  }

  // Update health profile
  const healthProfile = await pb.collection('health_profile')
    .getFirstListItem(`user_id = "${id}"`)
    .catch(() => null);

  const updateData = {};
  if (treatment_plan) updateData.treatment_plan = treatment_plan;

  let updatedProfile = healthProfile;
  if (healthProfile && Object.keys(updateData).length > 0) {
    updatedProfile = await pb.collection('health_profile').update(healthProfile.id, updateData);
  }

  // Create clinical notes
  if (notes) {
    await pb.collection('clinical_notes').create({
      user_id: id,
      provider_id: providerId,
      note_content: notes,
      date_created: new Date().toISOString(),
    });
  }

  logger.info(`Updated patient ${id} by provider ${providerId}`);

  res.json(updatedProfile);
});

/**
 * POST /provider/notes
 * Create clinical notes for a patient
 */
router.post('/notes', async (req, res) => {
  const { user_id, appointment_id, note_content } = req.body;
  const providerId = req.pocketbaseUserId;

  if (!user_id || !note_content) {
    return res.status(400).json({
      error: 'Missing required fields: user_id, note_content',
    });
  }

  // Verify provider has access to this patient
  const relationship = await pb.collection('patient_provider_relationships')
    .getFirstListItem(`provider_id = "${providerId}" && patient_id = "${user_id}"`)
    .catch(() => null);

  if (!relationship) {
    return res.status(403).json({
      error: 'You do not have access to this patient',
    });
  }

  const noteData = {
    user_id,
    provider_id: providerId,
    appointment_id: appointment_id || '',
    note_content,
    date_created: new Date().toISOString(),
  };

  const clinicalNote = await pb.collection('clinical_notes').create(noteData);

  logger.info(`Clinical note created: ${clinicalNote.id}`);

  res.json({
    id: clinicalNote.id,
    date_created: clinicalNote.date_created,
  });
});

export default router;