import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /refill-status
 * Fetch refill requests for a user
 */
router.get('/', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({
      error: 'Missing required query parameter: user_id',
    });
  }

  const refillRequests = await pb.collection('refill_requests').getFullList({
    filter: `user_id = "${user_id}"`,
    sort: '-requested_at',
  });

  // Populate prescription and pharmacy details
  const refillsWithDetails = await Promise.all(
    refillRequests.map(async (refill) => {
      try {
        const prescription = await pb.collection('current_medications').getOne(refill.prescription_id);
        const pharmacy = await pb.collection('pharmacies').getOne(refill.pharmacy_id);
        return {
          ...refill,
          prescription_details: prescription,
          pharmacy_details: pharmacy,
        };
      } catch (error) {
        logger.warn(`Failed to fetch details for refill ${refill.id}:`, error.message);
        return refill;
      }
    })
  );

  logger.info(`Fetched ${refillsWithDetails.length} refill requests for user ${user_id}`);

  res.json(refillsWithDetails);
});

export default router;