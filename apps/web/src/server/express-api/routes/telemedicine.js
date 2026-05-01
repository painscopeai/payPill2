import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /telemedicine/start
 * Start a telemedicine session
 */
router.post('/start', async (req, res) => {
  const { appointment_id } = req.body;

  if (!appointment_id) {
    return res.status(400).json({
      error: 'Missing required field: appointment_id',
    });
  }

  // Validate appointment exists and is telemedicine type
  const appointment = await pb.collection('appointments').getOne(appointment_id);

  if (appointment.type !== 'telemedicine') {
    return res.status(400).json({
      error: 'Appointment is not a telemedicine appointment',
    });
  }

  // Create telemedicine session record
  const sessionData = {
    appointment_id,
    user_id: appointment.user_id,
    provider_id: appointment.provider_id,
    status: 'active',
    started_at: new Date().toISOString(),
  };

  const session = await pb.collection('telemedicine_sessions').create(sessionData);

  // Generate mock video call token (MVP placeholder)
  const callToken = `token_${session.id}_${Date.now()}`;

  logger.info(`Telemedicine session started: ${session.id}`);

  res.json({
    session_id: session.id,
    call_token: callToken,
    appointment_details: {
      id: appointment.id,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      provider_id: appointment.provider_id,
    },
  });
});

export default router;