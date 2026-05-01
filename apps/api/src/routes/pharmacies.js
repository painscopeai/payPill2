import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Haversine formula to calculate distance between two coordinates
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * GET /pharmacies
 * Search pharmacies by location and type
 */
router.get('/', async (req, res) => {
  const { location, latitude, longitude, type } = req.query;

  let filter = '';
  const filters = [];

  if (type) {
    filters.push(`type = "${type}"`);
  }

  if (filters.length > 0) {
    filter = filters.join(' && ');
  }

  const pharmacies = await pb.collection('pharmacies').getFullList({
    filter: filter || undefined,
  });

  // If latitude and longitude provided, calculate distances and sort
  if (latitude && longitude) {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        error: 'Invalid latitude or longitude values',
      });
    }

    const pharmaciesWithDistance = pharmacies
      .map((pharmacy) => ({
        ...pharmacy,
        distance_km: calculateDistance(lat, lon, pharmacy.latitude, pharmacy.longitude),
      }))
      .sort((a, b) => a.distance_km - b.distance_km);

    logger.info(`Found ${pharmaciesWithDistance.length} pharmacies`);
    return res.json(pharmaciesWithDistance);
  }

  // If location (address/zip) provided, filter by location field
  if (location) {
    const filteredPharmacies = pharmacies.filter((p) =>
      p.address?.toLowerCase().includes(location.toLowerCase()) ||
      p.zip_code?.includes(location)
    );

    logger.info(`Found ${filteredPharmacies.length} pharmacies for location: ${location}`);
    return res.json(filteredPharmacies);
  }

  logger.info(`Found ${pharmacies.length} pharmacies`);
  res.json(pharmacies);
});

export default router;