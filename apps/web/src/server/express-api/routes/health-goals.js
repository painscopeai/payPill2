import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';

const router = new App();
const sb = () => getSupabaseAdmin();

router.get('/', async (req, res) => {
	const { user_id } = req.query;
	if (!user_id) {
		return res.status(400).json({ error: 'Missing required query parameter: user_id' });
	}

	const { data: healthGoals, error } = await sb()
		.from('health_goals')
		.select('*')
		.eq('user_id', user_id)
		.order('created_at', { ascending: false });

	if (error) {
		logger.error('[health-goals] list', error);
		return res.status(500).json({ error: 'Failed to load health goals' });
	}

	const goalsWithProgress = (healthGoals || []).map((goal) => {
		const targetDate = new Date(goal.target_date);
		const now = new Date();
		const created = new Date(goal.created_at);
		const totalDays = Math.max(1, targetDate.getTime() - created.getTime());
		const elapsedDays = now.getTime() - created.getTime();
		const progressPercentage = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
		return { ...goal, created: goal.created_at, progress_percentage: progressPercentage };
	});

	return res.json(goalsWithProgress);
});

router.post('/', async (req, res) => {
	const { user_id, goal_name, goal_type, target_value, target_date } = req.body;
	if (!user_id || !goal_name || !goal_type || !target_date) {
		return res.status(400).json({
			error: 'Missing required fields: user_id, goal_name, goal_type, target_date',
		});
	}

	const targetDateTime = new Date(target_date);
	if (targetDateTime <= new Date()) {
		return res.status(400).json({ error: 'Target date must be in the future' });
	}

	const row = {
		user_id,
		goal_name,
		goal_type,
		target_value: target_value || '',
		target_date,
		status: 'active',
	};

	const { data: healthGoal, error } = await sb().from('health_goals').insert(row).select().single();
	if (error) {
		logger.error('[health-goals] create', error);
		return res.status(500).json({ error: 'Failed to create health goal' });
	}

	return res.status(201).json({
		id: healthGoal.id,
		goal_name: healthGoal.goal_name,
		status: healthGoal.status,
	});
});

export default router;
