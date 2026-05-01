import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';

const router = new App();
const sb = () => getSupabaseAdmin();

router.post('/start', async (req, res) => {
	const { appointment_id } = req.body;
	if (!appointment_id) {
		return res.status(400).json({ error: 'Missing required field: appointment_id' });
	}

	const { data: appointment, error: aErr } = await sb()
		.from('appointments')
		.select('*')
		.eq('id', appointment_id)
		.maybeSingle();

	if (aErr || !appointment) {
		return res.status(404).json({ error: 'Appointment not found' });
	}

	if (String(appointment.type || '').toLowerCase() !== 'telemedicine') {
		return res.status(400).json({ error: 'Appointment is not a telemedicine appointment' });
	}

	const sessionData = {
		appointment_id,
		user_id: appointment.user_id,
		provider_id: appointment.provider_id,
		status: 'active',
		started_at: new Date().toISOString(),
	};

	const { data: session, error } = await sb().from('telemedicine_sessions').insert(sessionData).select().single();
	if (error) {
		logger.error('[telemedicine]', error);
		return res.status(500).json({ error: 'Failed to start session' });
	}

	const callToken = `token_${session.id}_${Date.now()}`;

	return res.json({
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
