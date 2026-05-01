import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /prescriptions
 * Create a new prescription
 */
router.post('/', async (req, res) => {
  const { user_id, provider_id, medication_name, dosage, frequency, quantity, refills_remaining } = req.body;

  if (!user_id || !provider_id || !medication_name || !dosage || !frequency) {
    return res.status(400).json({
      error: 'Missing required fields: user_id, provider_id, medication_name, dosage, frequency',
    });
  }

  const prescriptionData = {
    user_id,
    provider_id,
    medication_name,
    dosage,
    frequency,
    quantity: quantity || 30,
    refills_remaining: refills_remaining || 0,
    status: 'active',
    date_prescribed: new Date().toISOString(),
  };

  const prescription = await pb.collection('prescriptions').create(prescriptionData);

  logger.info(`Prescription created: ${prescription.id}`);

  res.status(201).json({
    id: prescription.id,
    medication_name: prescription.medication_name,
    dosage: prescription.dosage,
    status: 'active',
  });
});

/**
 * GET /prescriptions
 * Fetch prescriptions for a user
 */
router.get('/', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    throw new Error('Missing required query parameter: user_id');
  }

  const data = await pb.collection('prescriptions').getList(1, 50, {
    filter: `user_id="${user_id}"`,
  });

  logger.info(`Fetched ${data.items.length} prescriptions for user ${user_id}`);

  res.json(data.items);
});

/**
 * POST /prescriptions/refill
 * Request a refill for a prescription
 */
router.post('/refill', async (req, res) => {
  const { userId, prescriptionId, quantity, pharmacy, deliveryMethod, specialInstructions } = req.body;

  // Validate required fields
  if (!userId || !prescriptionId) {
    return res.status(400).json({
      error: 'Missing required fields: userId, prescriptionId',
    });
  }

  // Fetch prescription
  const prescription = await pb.collection('prescriptions').getOne(prescriptionId);

  // Validate prescription belongs to user
  if (prescription.user_id !== userId) {
    return res.status(400).json({
      error: 'Prescription does not belong to this user',
    });
  }

  // Validate prescription is active
  if (prescription.status !== 'active') {
    return res.status(400).json({
      error: 'Prescription is not active',
    });
  }

  // Validate refills remaining
  if (prescription.refills_remaining <= 0) {
    return res.status(400).json({
      error: 'No refills remaining for this prescription',
    });
  }

  // Generate refill request ID
  const refillRequestId = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Create refill request
  const refillRequestData = {
    user_id: userId,
    prescription_id: prescriptionId,
    refill_request_id: refillRequestId,
    quantity: quantity || prescription.quantity,
    pharmacy: pharmacy || '',
    delivery_method: deliveryMethod || 'standard',
    special_instructions: specialInstructions || '',
    status: 'pending',
    requested_at: new Date().toISOString(),
  };

  const refillRequest = await pb.collection('refill_requests').create(refillRequestData);

  // Update prescription refills_remaining
  const updatedPrescription = await pb.collection('prescriptions').update(prescriptionId, {
    refills_remaining: prescription.refills_remaining - 1,
  });

  // Send refill confirmation email
  try {
    const user = await pb.collection('users').getOne(userId);
    await pb.sendEmail({
      to: user.email,
      subject: `Prescription Refill Requested - ${refillRequestId}`,
      html: `
        <h2>Refill Request Confirmed</h2>
        <p><strong>Refill Request ID:</strong> ${refillRequestId}</p>
        <p><strong>Medication:</strong> ${prescription.medication_name}</p>
        <p><strong>Dosage:</strong> ${prescription.dosage}</p>
        <p><strong>Quantity:</strong> ${quantity || prescription.quantity}</p>
        <p><strong>Delivery Method:</strong> ${deliveryMethod || 'Standard'}</p>
        <p><strong>Status:</strong> Pending</p>
        <p>Your refill request has been submitted. You will receive a confirmation when it's ready for pickup or delivery.</p>
      `,
    });
  } catch (error) {
    logger.warn('Failed to send refill confirmation email:', error.message);
  }

  // Calculate estimated delivery date (3-5 business days)
  const estimatedDeliveryDate = new Date();
  estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5);

  logger.info(`Refill request created: ${refillRequest.id}`);

  res.status(201).json({
    refillRequestId: refillRequestId,
    prescriptionId: prescriptionId,
    medication: prescription.medication_name,
    dosage: prescription.dosage,
    quantity: quantity || prescription.quantity,
    status: 'pending',
    estimatedDeliveryDate: estimatedDeliveryDate.toISOString().split('T')[0],
    refillsRemaining: updatedPrescription.refills_remaining,
  });
});

/**
 * PUT /prescriptions/:id/refill
 * Request a refill for a prescription (legacy endpoint)
 */
router.put('/:id/refill', async (req, res) => {
  const { id } = req.params;
  const { pharmacy_id } = req.body;

  if (!pharmacy_id) {
    return res.status(400).json({
      error: 'Missing required field: pharmacy_id',
    });
  }

  // Fetch prescription
  const prescription = await pb.collection('prescriptions').getOne(id);

  if (prescription.refills_remaining <= 0) {
    return res.status(400).json({
      error: 'No refills remaining for this prescription',
    });
  }

  // Create refill request
  const refillRequestData = {
    prescription_id: id,
    user_id: prescription.user_id,
    pharmacy_id,
    status: 'pending',
    requested_at: new Date().toISOString(),
  };

  const refillRequest = await pb.collection('refill_requests').create(refillRequestData);

  // Update prescription refills_remaining
  const updatedPrescription = await pb.collection('prescriptions').update(id, {
    refills_remaining: prescription.refills_remaining - 1,
  });

  // Send refill confirmation email
  try {
    const user = await pb.collection('users').getOne(prescription.user_id);
    await pb.sendEmail({
      to: user.email,
      subject: 'Prescription Refill Requested',
      html: `<p>Your refill request for ${prescription.medication_name} has been submitted to the pharmacy.</p>`,
    });
  } catch (error) {
    logger.warn('Failed to send refill confirmation email:', error.message);
  }

  // Calculate estimated delivery date (3-5 business days)
  const estimatedDeliveryDate = new Date();
  estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5);

  logger.info(`Refill request created: ${refillRequest.id}`);

  res.json({
    refill_request_id: refillRequest.id,
    status: 'pending',
    estimated_delivery_date: estimatedDeliveryDate.toISOString().split('T')[0],
  });
});

export default router;