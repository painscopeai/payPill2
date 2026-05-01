import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /health-goals
 * Fetch health goals for a user
 */
router.get('/', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({
      error: 'Missing required query parameter: user_id',
    });
  }

  const healthGoals = await pb.collection('health_goals').getFullList({
    filter: `user_id = "${user_id}"`,
    sort: '-created',
  });

  // Calculate progress for each goal
  const goalsWithProgress = healthGoals.map((goal) => {
    const targetDate = new Date(goal.target_date);
    const now = new Date();
    const totalDays = targetDate.getTime() - new Date(goal.created).getTime();
    const elapsedDays = now.getTime() - new Date(goal.created).getTime();
    const progressPercentage = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

    return {
      ...goal,
      progress_percentage: progressPercentage,
    };
  });

  logger.info(`Fetched ${goalsWithProgress.length} health goals for user ${user_id}`);

  res.json(goalsWithProgress);
});

/**
 * POST /health-goals
 * Create a new health goal
 */
router.post('/', async (req, res) => {
  const { user_id, goal_name, goal_type, target_value, target_date } = req.body;

  if (!user_id || !goal_name || !goal_type || !target_date) {
    return res.status(400).json({
      error: 'Missing required fields: user_id, goal_name, goal_type, target_date',
    });
  }

  // Validate target_date is in future
  const targetDateTime = new Date(target_date);
  const now = new Date();
  if (targetDateTime <= now) {
    return res.status(400).json({
      error: 'Target date must be in the future',
    });
  }

  const goalData = {
    user_id,
    goal_name,
    goal_type,
    target_value: target_value || '',
    target_date,
    status: 'active',
    created: new Date().toISOString(),
  };

  const healthGoal = await pb.collection('health_goals').create(goalData);

  logger.info(`Health goal created: ${healthGoal.id}`);

  res.status(201).json({
    id: healthGoal.id,
    status: 'active',
  });
});

export default router;