import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Validate appointment date and time
 * Accepts today and all future dates
 * Rejects only past dates (dates before today)
 * Handles timezone conversions properly
 * 
 * @param {string} appointmentDate - Date in YYYY-MM-DD format
 * @param {string} appointmentTime - Time in HH:MM format (24-hour)
 * @returns {object} - { valid: boolean, error?: string }
 */
function validateAppointmentDateTime(appointmentDate, appointmentTime) {
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(appointmentDate)) {
    return {
      valid: false,
      error: 'Invalid date format. Expected YYYY-MM-DD (e.g., 2026-04-29)',
    };
  }

  // Validate time format (HH:MM in 24-hour format)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(appointmentTime)) {
    return {
      valid: false,
      error: 'Invalid time format. Expected HH:MM in 24-hour format (e.g., 14:30)',
    };
  }

  // Parse the appointment date
  // Use local timezone to avoid timezone conversion issues
  const [year, month, day] = appointmentDate.split('-').map(Number);
  const appointmentDateObj = new Date(year, month - 1, day);

  // Validate date is a valid calendar date
  if (
    appointmentDateObj.getFullYear() !== year ||
    appointmentDateObj.getMonth() !== month - 1 ||
    appointmentDateObj.getDate() !== day
  ) {
    return {
      valid: false,
      error: 'Invalid calendar date. Please check the date values.',
    };
  }

  // Get today's date at start of day (local timezone)
  // This ensures we compare dates at midnight, avoiding time-of-day issues
  const today = new Date();
  const todayAtStartOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  logger.debug(`[validateAppointmentDateTime] Appointment date: ${appointmentDate}`);
  logger.debug(`[validateAppointmentDateTime] Appointment time: ${appointmentTime}`);
  logger.debug(`[validateAppointmentDateTime] Today at start of day: ${todayAtStartOfDay.toISOString()}`);
  logger.debug(`[validateAppointmentDateTime] Appointment date object: ${appointmentDateObj.toISOString()}`);
  logger.debug(`[validateAppointmentDateTime] Comparison: ${appointmentDateObj.getTime()} >= ${todayAtStartOfDay.getTime()} ? ${appointmentDateObj.getTime() >= todayAtStartOfDay.getTime()}`);

  // Compare dates at start of day to avoid time-of-day issues
  // Reject only if appointment date is BEFORE today
  // Allow appointments for today and all future dates
  if (appointmentDateObj.getTime() < todayAtStartOfDay.getTime()) {
    return {
      valid: false,
      error: 'Appointment date is in the past. Please select today or a future date.',
    };
  }

  return { valid: true };
}

/**
 * POST /appointments
 * Create a new appointment
 */
router.post('/', async (req, res) => {
  const { user_id, provider_id, appointment_date, appointment_time, type, reason } = req.body;

  // Validate required fields
  if (!user_id || !provider_id || !appointment_date || !appointment_time || !type) {
    return res.status(400).json({
      error: 'Missing required fields: user_id, provider_id, appointment_date, appointment_time, type',
    });
  }

  // Validate appointment date and time
  const dateTimeValidation = validateAppointmentDateTime(appointment_date, appointment_time);
  if (!dateTimeValidation.valid) {
    return res.status(400).json({
      error: dateTimeValidation.error,
    });
  }

  // Check provider availability (simplified - check if provider exists)
  const provider = await pb.collection('providers').getOne(provider_id).catch(() => null);
  if (!provider) {
    return res.status(400).json({
      error: 'Provider not found',
    });
  }

  // Create appointment record
  const appointmentData = {
    user_id,
    provider_id,
    appointment_date,
    appointment_time,
    type,
    reason: reason || '',
    status: 'scheduled',
  };

  const appointment = await pb.collection('appointments').create(appointmentData);

  // Send confirmation email via PocketBase mailer
  try {
    const user = await pb.collection('users').getOne(user_id);
    await pb.sendEmail({
      to: user.email,
      subject: 'Appointment Confirmation',
      html: `<p>Your appointment has been scheduled for ${appointment_date} at ${appointment_time}</p>`,
    });
  } catch (error) {
    logger.warn('Failed to send confirmation email:', error.message);
  }

  logger.info(`Appointment created: ${appointment.id}`);

  res.status(201).json({
    id: appointment.id,
    status: 'scheduled',
    appointment_date: appointment.appointment_date,
    appointment_time: appointment.appointment_time,
  });
});

/**
 * POST /appointments/book
 * Book a new appointment with validation and confirmation
 */
router.post('/book', async (req, res) => {
  const {
    userId,
    providerId,
    providerName,
    appointmentType,
    appointmentDate,
    appointmentTime,
    location,
    reason,
    insuranceInfo,
    copayAmount,
  } = req.body;

  // Validate required fields
  if (!userId || !providerId || !appointmentDate || !appointmentTime || !appointmentType) {
    return res.status(400).json({
      error: 'Missing required fields: userId, providerId, appointmentDate, appointmentTime, appointmentType',
    });
  }

  // Validate appointment date and time
  const dateTimeValidation = validateAppointmentDateTime(appointmentDate, appointmentTime);
  if (!dateTimeValidation.valid) {
    return res.status(400).json({
      error: dateTimeValidation.error,
    });
  }

  // Check provider availability
  const provider = await pb.collection('providers').getOne(providerId).catch(() => null);
  if (!provider) {
    return res.status(400).json({
      error: 'Provider not found',
    });
  }

  // Generate confirmation number
  const confirmationNumber = `APT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Create appointment record
  const appointmentData = {
    user_id: userId,
    provider_id: providerId,
    provider_name: providerName || provider.provider_name,
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    appointment_type: appointmentType,
    location: location || provider.address,
    reason: reason || '',
    insurance_info: insuranceInfo || '',
    copay_amount: copayAmount || 0,
    confirmation_number: confirmationNumber,
    status: 'confirmed',
    created_at: new Date().toISOString(),
  };

  const appointment = await pb.collection('patient_appointments').create(appointmentData);

  // Send confirmation email
  try {
    const user = await pb.collection('users').getOne(userId);
    await pb.sendEmail({
      to: user.email,
      subject: `Appointment Confirmation - ${confirmationNumber}`,
      html: `
        <h2>Appointment Confirmed</h2>
        <p><strong>Confirmation Number:</strong> ${confirmationNumber}</p>
        <p><strong>Provider:</strong> ${providerName || provider.provider_name}</p>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>
        <p><strong>Location:</strong> ${location || provider.address}</p>
        <p><strong>Type:</strong> ${appointmentType}</p>
        ${copayAmount ? `<p><strong>Copay:</strong> $${copayAmount}</p>` : ''}
      `,
    });
  } catch (error) {
    logger.warn('Failed to send confirmation email:', error.message);
  }

  logger.info(`Appointment booked: ${appointment.id} with confirmation ${confirmationNumber}`);

  res.status(201).json({
    id: appointment.id,
    confirmationNumber: confirmationNumber,
    status: 'confirmed',
    appointmentDate: appointment.appointment_date,
    appointmentTime: appointment.appointment_time,
    provider: providerName || provider.provider_name,
    location: location || provider.address,
    copayAmount: copayAmount || 0,
  });
});

/**
 * GET /appointments
 * Fetch appointments with optional filters
 */
router.get('/', async (req, res) => {
  const { user_id, provider_id, status } = req.query;

  let filter = '';
  const filters = [];

  if (user_id) filters.push(`user_id = "${user_id}"`);
  if (provider_id) filters.push(`provider_id = "${provider_id}"`);
  if (status) filters.push(`status = "${status}"`);

  if (filters.length > 0) {
    filter = filters.join(' && ');
  }

  const appointments = await pb.collection('appointments').getFullList({
    filter: filter || undefined,
    sort: '-appointment_date',
  });

  // Populate provider details
  const appointmentsWithProviders = await Promise.all(
    appointments.map(async (apt) => {
      try {
        const provider = await pb.collection('providers').getOne(apt.provider_id);
        return {
          ...apt,
          provider_details: provider,
        };
      } catch (error) {
        logger.warn(`Failed to fetch provider ${apt.provider_id}:`, error.message);
        return apt;
      }
    })
  );

  logger.info(`Fetched ${appointmentsWithProviders.length} appointments`);

  res.json(appointmentsWithProviders);
});

/**
 * PUT /appointments/:id
 * Update appointment
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, notes, appointment_date, appointment_time } = req.body;

  // Fetch existing appointment
  const existingAppointment = await pb.collection('appointments').getOne(id);

  // Validate future date if rescheduling
  if (appointment_date && appointment_time) {
    const dateTimeValidation = validateAppointmentDateTime(appointment_date, appointment_time);
    if (!dateTimeValidation.valid) {
      return res.status(400).json({
        error: dateTimeValidation.error,
      });
    }
  }

  // Prepare update data
  const updateData = {};
  if (status) updateData.status = status;
  if (notes) updateData.notes = notes;
  if (appointment_date) updateData.appointment_date = appointment_date;
  if (appointment_time) updateData.appointment_time = appointment_time;

  // Update appointment
  const updatedAppointment = await pb.collection('appointments').update(id, updateData);

  // Send emails based on status change
  try {
    const user = await pb.collection('users').getOne(existingAppointment.user_id);

    if (status === 'cancelled' && existingAppointment.status !== 'cancelled') {
      await pb.sendEmail({
        to: user.email,
        subject: 'Appointment Cancelled',
        html: `<p>Your appointment scheduled for ${existingAppointment.appointment_date} has been cancelled.</p>`,
      });
    } else if ((appointment_date || appointment_time) && existingAppointment.status === 'scheduled') {
      const newDate = appointment_date || existingAppointment.appointment_date;
      const newTime = appointment_time || existingAppointment.appointment_time;
      await pb.sendEmail({
        to: user.email,
        subject: 'Appointment Rescheduled',
        html: `<p>Your appointment has been rescheduled to ${newDate} at ${newTime}.</p>`,
      });
    }
  } catch (error) {
    logger.warn('Failed to send email:', error.message);
  }

  logger.info(`Appointment updated: ${id}`);

  res.json(updatedAppointment);
});

/**
 * DELETE /appointments/:id
 * Delete appointment
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  // Fetch appointment before deletion
  const appointment = await pb.collection('appointments').getOne(id);

  // Delete appointment
  await pb.collection('appointments').delete(id);

  // Send cancellation emails
  try {
    const user = await pb.collection('users').getOne(appointment.user_id);
    const provider = await pb.collection('providers').getOne(appointment.provider_id);

    await pb.sendEmail({
      to: user.email,
      subject: 'Appointment Cancelled',
      html: `<p>Your appointment scheduled for ${appointment.appointment_date} at ${appointment.appointment_time} has been cancelled.</p>`,
    });

    if (provider.email) {
      await pb.sendEmail({
        to: provider.email,
        subject: 'Appointment Cancelled',
        html: `<p>An appointment scheduled for ${appointment.appointment_date} at ${appointment.appointment_time} has been cancelled.</p>`,
      });
    }
  } catch (error) {
    logger.warn('Failed to send cancellation emails:', error.message);
  }

  logger.info(`Appointment deleted: ${id}`);

  res.json({ success: true });
});

export default router;
