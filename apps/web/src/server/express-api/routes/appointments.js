import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';

const router = new App();
const sb = () => getSupabaseAdmin();

function validateAppointmentDateTime(appointmentDate, appointmentTime) {
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(appointmentDate)) {
		return { valid: false, error: 'Invalid date format. Expected YYYY-MM-DD (e.g., 2026-04-29)' };
	}
	const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
	if (!timeRegex.test(appointmentTime)) {
		return { valid: false, error: 'Invalid time format. Expected HH:MM in 24-hour format (e.g., 14:30)' };
	}
	const [year, month, day] = appointmentDate.split('-').map(Number);
	const appointmentDateObj = new Date(year, month - 1, day);
	if (
		appointmentDateObj.getFullYear() !== year ||
		appointmentDateObj.getMonth() !== month - 1 ||
		appointmentDateObj.getDate() !== day
	) {
		return { valid: false, error: 'Invalid calendar date. Please check the date values.' };
	}
	const today = new Date();
	const todayAtStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	if (appointmentDateObj.getTime() < todayAtStartOfDay.getTime()) {
		return { valid: false, error: 'Appointment date is in the past. Please select today or a future date.' };
	}
	return { valid: true };
}

router.post('/', async (req, res) => {
	const { user_id, provider_id, appointment_date, appointment_time, type, reason } = req.body;

	if (!user_id || !provider_id || !appointment_date || !appointment_time || !type) {
		return res.status(400).json({
			error: 'Missing required fields: user_id, provider_id, appointment_date, appointment_time, type',
		});
	}

	const dateTimeValidation = validateAppointmentDateTime(appointment_date, appointment_time);
	if (!dateTimeValidation.valid) {
		return res.status(400).json({ error: dateTimeValidation.error });
	}

	const { data: provider, error: pErr } = await sb()
		.from('providers')
		.select('id')
		.eq('id', provider_id)
		.maybeSingle();
	if (pErr || !provider) {
		return res.status(400).json({ error: 'Provider not found' });
	}

	const row = {
		user_id,
		provider_id,
		type,
		appointment_date,
		appointment_time,
		reason: reason || '',
		status: 'scheduled',
	};

	const { data: appointment, error } = await sb().from('appointments').insert(row).select().single();
	if (error) {
		logger.error('[appointments] create', error);
		return res.status(500).json({ error: 'Failed to create appointment' });
	}

	logger.info(`Appointment created: ${appointment.id}`);
	return res.status(201).json({
		id: appointment.id,
		status: appointment.status,
		appointment_date: appointment.appointment_date,
		appointment_time: appointment.appointment_time,
	});
});

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

	if (!userId || !providerId || !appointmentDate || !appointmentTime || !appointmentType) {
		return res.status(400).json({
			error: 'Missing required fields: userId, providerId, appointmentDate, appointmentTime, appointmentType',
		});
	}

	const dateTimeValidation = validateAppointmentDateTime(appointmentDate, appointmentTime);
	if (!dateTimeValidation.valid) {
		return res.status(400).json({ error: dateTimeValidation.error });
	}

	const { data: provider, error: pErr } = await sb()
		.from('providers')
		.select('id, provider_name, name, address, email')
		.eq('id', providerId)
		.maybeSingle();
	if (pErr || !provider) {
		return res.status(400).json({ error: 'Provider not found' });
	}

	const confirmationNumber = `APT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
	const pname = providerName || provider.provider_name || provider.name;

	const row = {
		user_id: userId,
		provider_id: providerId,
		provider_name: pname,
		type: appointmentType,
		appointment_date: appointmentDate,
		appointment_time: appointmentTime,
		appointment_type: appointmentType,
		location: location || provider.address || null,
		reason: reason || '',
		insurance_info: insuranceInfo || '',
		copay_amount: copayAmount || 0,
		confirmation_number: confirmationNumber,
		status: 'confirmed',
	};

	const { data: appointment, error } = await sb().from('appointments').insert(row).select().single();
	if (error) {
		logger.error('[appointments] book', error);
		return res.status(500).json({ error: 'Failed to book appointment' });
	}

	logger.info(`Appointment booked: ${appointment.id} with confirmation ${confirmationNumber}`);

	return res.status(201).json({
		id: appointment.id,
		confirmationNumber,
		status: 'confirmed',
		appointmentDate: appointment.appointment_date,
		appointmentTime: appointment.appointment_time,
		provider: pname,
		location: location || provider.address,
		copayAmount: copayAmount || 0,
	});
});

router.get('/', async (req, res) => {
	const { user_id, provider_id, status } = req.query;

	let q = sb().from('appointments').select('*').order('appointment_date', { ascending: false });
	if (user_id) q = q.eq('user_id', user_id);
	if (provider_id) q = q.eq('provider_id', provider_id);
	if (status) q = q.eq('status', status);

	const { data: appointments, error } = await q;
	if (error) {
		logger.error('[appointments] list', error);
		return res.status(500).json({ error: 'Failed to list appointments' });
	}

	const appointmentsWithProviders = await Promise.all(
		(appointments || []).map(async (apt) => {
			if (!apt.provider_id) return apt;
			const { data: prov } = await sb()
				.from('providers')
				.select('*')
				.eq('id', apt.provider_id)
				.maybeSingle();
			return { ...apt, provider_details: prov || null };
		}),
	);

	return res.json(appointmentsWithProviders);
});

router.put('/:id', async (req, res) => {
	const { id } = req.params;
	const { status, notes, appointment_date, appointment_time } = req.body;

	const { data: existingAppointment, error: gErr } = await sb()
		.from('appointments')
		.select('*')
		.eq('id', id)
		.maybeSingle();
	if (gErr || !existingAppointment) {
		return res.status(404).json({ error: 'Appointment not found' });
	}

	if (appointment_date && appointment_time) {
		const dateTimeValidation = validateAppointmentDateTime(appointment_date, appointment_time);
		if (!dateTimeValidation.valid) {
			return res.status(400).json({ error: dateTimeValidation.error });
		}
	}

	const updateData = {};
	if (status) updateData.status = status;
	if (notes !== undefined) updateData.notes = notes;
	if (appointment_date) updateData.appointment_date = appointment_date;
	if (appointment_time) updateData.appointment_time = appointment_time;

	const { data: updatedAppointment, error } = await sb()
		.from('appointments')
		.update(updateData)
		.eq('id', id)
		.select()
		.single();
	if (error) {
		logger.error('[appointments] update', error);
		return res.status(500).json({ error: 'Failed to update appointment' });
	}

	return res.json(updatedAppointment);
});

router.delete('/:id', async (req, res) => {
	const { id } = req.params;

	const { error } = await sb().from('appointments').delete().eq('id', id);
	if (error) {
		logger.error('[appointments] delete', error);
		return res.status(500).json({ error: 'Failed to delete appointment' });
	}

	return res.json({ success: true });
});

export default router;
