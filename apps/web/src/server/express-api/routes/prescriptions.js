import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';

const router = new App();
const sb = () => getSupabaseAdmin();

router.post('/', async (req, res) => {
	const { user_id, provider_id, medication_name, dosage, frequency, quantity, refills_remaining } = req.body;

	if (!user_id || !provider_id || !medication_name || !dosage || !frequency) {
		return res.status(400).json({
			error: 'Missing required fields: user_id, provider_id, medication_name, dosage, frequency',
		});
	}

	const row = {
		user_id,
		provider_id,
		medication_name,
		dosage,
		frequency,
		quantity: quantity || 30,
		refills_remaining: refills_remaining || 0,
		status: 'active',
	};

	const { data: prescription, error } = await sb().from('prescriptions').insert(row).select().single();
	if (error) {
		logger.error('[prescriptions] create', error);
		return res.status(500).json({ error: 'Failed to create prescription' });
	}

	return res.status(201).json({
		id: prescription.id,
		medication_name: prescription.medication_name,
		dosage: prescription.dosage,
		status: 'active',
	});
});

router.get('/', async (req, res) => {
	const { user_id } = req.query;
	if (!user_id) {
		return res.status(400).json({ error: 'Missing required query parameter: user_id' });
	}

	const { data: items, error } = await sb()
		.from('prescriptions')
		.select('*')
		.eq('user_id', user_id)
		.limit(50);

	if (error) {
		logger.error('[prescriptions] list', error);
		return res.status(500).json({ error: 'Failed to list prescriptions' });
	}

	return res.json(items || []);
});

router.post('/refill', async (req, res) => {
	const { userId, prescriptionId, quantity, pharmacy, deliveryMethod, specialInstructions } = req.body;

	if (!userId || !prescriptionId) {
		return res.status(400).json({ error: 'Missing required fields: userId, prescriptionId' });
	}

	const { data: prescription, error: pErr } = await sb()
		.from('prescriptions')
		.select('*')
		.eq('id', prescriptionId)
		.maybeSingle();

	if (pErr || !prescription) {
		return res.status(404).json({ error: 'Prescription not found' });
	}
	if (prescription.user_id !== userId) {
		return res.status(400).json({ error: 'Prescription does not belong to this user' });
	}
	if (prescription.status !== 'active') {
		return res.status(400).json({ error: 'Prescription is not active' });
	}
	if ((prescription.refills_remaining || 0) <= 0) {
		return res.status(400).json({ error: 'No refills remaining for this prescription' });
	}

	const refillRequestId = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

	const refillRow = {
		user_id: userId,
		prescription_id: prescriptionId,
		refill_request_id: refillRequestId,
		quantity: quantity || prescription.quantity,
		pharmacy: pharmacy || '',
		delivery_method: deliveryMethod || 'standard',
		special_instructions: specialInstructions || '',
		status: 'pending',
	};

	const { error: rErr } = await sb().from('refill_requests').insert(refillRow);
	if (rErr) {
		logger.error('[prescriptions] refill insert', rErr);
		return res.status(500).json({ error: 'Failed to create refill request' });
	}

	const { data: updatedPrescription, error: uErr } = await sb()
		.from('prescriptions')
		.update({ refills_remaining: (prescription.refills_remaining || 0) - 1 })
		.eq('id', prescriptionId)
		.select()
		.single();

	if (uErr) {
		logger.warn('[prescriptions] refill update', uErr.message);
	}

	const estimatedDeliveryDate = new Date();
	estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5);

	return res.status(201).json({
		refillRequestId,
		prescriptionId,
		medication: prescription.medication_name,
		dosage: prescription.dosage,
		quantity: quantity || prescription.quantity,
		status: 'pending',
		estimatedDeliveryDate: estimatedDeliveryDate.toISOString().split('T')[0],
		refillsRemaining: updatedPrescription?.refills_remaining ?? (prescription.refills_remaining || 0) - 1,
	});
});

router.put('/:id/refill', async (req, res) => {
	const { id } = req.params;
	const { pharmacy_id } = req.body;

	if (!pharmacy_id) {
		return res.status(400).json({ error: 'Missing required field: pharmacy_id' });
	}

	const { data: prescription, error: gErr } = await sb()
		.from('prescriptions')
		.select('*')
		.eq('id', id)
		.maybeSingle();

	if (gErr || !prescription) {
		return res.status(404).json({ error: 'Prescription not found' });
	}
	if ((prescription.refills_remaining || 0) <= 0) {
		return res.status(400).json({ error: 'No refills remaining for this prescription' });
	}

	const { error: rErr } = await sb().from('refill_requests').insert({
		prescription_id: id,
		user_id: prescription.user_id,
		pharmacy_id,
		status: 'pending',
	});

	if (rErr) {
		logger.error('[prescriptions] legacy refill', rErr);
		return res.status(500).json({ error: 'Failed to create refill request' });
	}

	await sb()
		.from('prescriptions')
		.update({ refills_remaining: (prescription.refills_remaining || 0) - 1 })
		.eq('id', id);

	const estimatedDeliveryDate = new Date();
	estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5);

	return res.json({
		refill_request_id: id,
		status: 'pending',
		estimated_delivery_date: estimatedDeliveryDate.toISOString().split('T')[0],
	});
});

export default router;
