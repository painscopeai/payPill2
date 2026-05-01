import { App } from '@tinyhttp/app';
import PDFDocument from 'pdfkit';
import logger from '../utils/logger.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';

const router = new App();
const sb = () => getSupabaseAdmin();

function generateCSV(data) {
	if (!Array.isArray(data) || data.length === 0) {
		return '';
	}
	const headers = Object.keys(data[0]);
	const escapeCSVValue = (value) => {
		if (value === null || value === undefined) {
			return '';
		}
		const stringValue = String(value);
		if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
			return `"${stringValue.replace(/"/g, '""')}"`;
		}
		return stringValue;
	};
	const headerRow = headers.map(escapeCSVValue).join(',');
	const dataRows = data.map((row) => headers.map((header) => escapeCSVValue(row[header])).join(','));
	return [headerRow, ...dataRows].join('\n');
}

async function userExists(userId) {
	const { data: profile } = await sb().from('profiles').select('id').eq('id', userId).maybeSingle();
	if (profile) return true;
	const { data: authUser } = await sb().auth.admin.getUserById(userId);
	return !!authUser?.user;
}

async function fetchAllUserData(userId) {
	const data = {
		user: null,
		healthProfile: null,
		medications: [],
		appointments: [],
		labResults: [],
		wellnessActivities: [],
		healthGoals: [],
		recommendations: [],
	};

	try {
		const { data: profile } = await sb().from('profiles').select('*').eq('id', userId).maybeSingle();
		data.user = profile;
	} catch (error) {
		logger.warn(`Failed to fetch user: ${error.message}`);
	}

	try {
		const { data: steps } = await sb()
			.from('patient_onboarding_steps')
			.select('step, data, updated_at')
			.eq('user_id', userId);
		data.healthProfile = { onboarding_steps: steps || [] };
	} catch (error) {
		logger.warn(`Failed to fetch onboarding / health profile: ${error.message}`);
	}

	try {
		const { data: meds } = await sb().from('prescriptions').select('*').eq('user_id', userId);
		data.medications = meds || [];
	} catch (error) {
		logger.warn(`Failed to fetch medications: ${error.message}`);
	}

	try {
		const { data: apts } = await sb().from('appointments').select('*').eq('user_id', userId);
		data.appointments = apts || [];
	} catch (error) {
		logger.warn(`Failed to fetch appointments: ${error.message}`);
	}

	try {
		const { data: labs } = await sb().from('lab_results').select('*').eq('user_id', userId);
		data.labResults = labs || [];
	} catch (error) {
		logger.warn(`Failed to fetch lab results: ${error.message}`);
	}

	try {
		const { data: act } = await sb().from('wellness_activities').select('*').eq('user_id', userId);
		data.wellnessActivities = act || [];
	} catch (error) {
		logger.warn(`Failed to fetch wellness activities: ${error.message}`);
	}

	try {
		const { data: goals } = await sb().from('health_goals').select('*').eq('user_id', userId);
		data.healthGoals = goals || [];
	} catch (error) {
		logger.warn(`Failed to fetch health goals: ${error.message}`);
	}

	try {
		const { data: recs } = await sb().from('patient_recommendations').select('*').eq('user_id', userId);
		data.recommendations = recs || [];
	} catch (error) {
		logger.warn(`Failed to fetch recommendations: ${error.message}`);
	}

	return data;
}

router.get('/export', async (req, res) => {
	const { userId, exportType } = req.query;

	if (!userId) {
		return res.status(400).json({
			error: 'Missing required query parameter: userId',
		});
	}

	const validExportTypes = ['all', 'health-records', 'medications', 'appointments', 'lab-results', 'wellness-activities'];
	const type = exportType || 'all';

	if (!validExportTypes.includes(type)) {
		return res.status(400).json({
			error: `Invalid exportType. Must be one of: ${validExportTypes.join(', ')}`,
		});
	}

	const ok = await userExists(userId);
	if (!ok) {
		return res.status(400).json({
			error: 'User not found',
		});
	}

	if (type === 'all') {
		const allData = await fetchAllUserData(userId);
		const filename = `health-export-${userId}-${Date.now()}.json`;
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		return res.json(allData);
	}
	if (type === 'health-records') {
		return exportHealthRecordsAsPDF(userId, res);
	}
	if (type === 'lab-results') {
		return exportLabResultsAsPDF(userId, res);
	}
	if (type === 'medications') {
		return exportMedicationsAsCSV(userId, res);
	}
	if (type === 'appointments') {
		return exportAppointmentsAsCSV(userId, res);
	}
	if (type === 'wellness-activities') {
		return exportWellnessActivitiesAsCSV(userId, res);
	}
});

async function exportHealthRecordsAsPDF(userId, res) {
	const doc = new PDFDocument();
	const filename = `health-records-${userId}-${Date.now()}.pdf`;

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

	doc.pipe(res);

	doc.fontSize(20).text('Health Records Export', { align: 'center' });
	doc.fontSize(12).text(`User ID: ${userId}`, { align: 'center' });
	doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
	doc.moveDown();

	try {
		const { data: steps } = await sb()
			.from('patient_onboarding_steps')
			.select('step, data')
			.eq('user_id', userId);
		doc.fontSize(14).text('Health profile (onboarding)', { underline: true });
		doc.fontSize(11);
		if (steps?.length) {
			for (const s of steps) {
				doc.text(`Step ${s.step}: ${JSON.stringify(s.data || {})}`);
			}
		} else {
			doc.text('No onboarding health data stored.');
		}
		doc.moveDown();
	} catch (error) {
		logger.warn(`Failed to fetch health profile: ${error.message}`);
	}

	try {
		const { data: medications } = await sb().from('prescriptions').select('*').eq('user_id', userId);
		if (medications?.length) {
			doc.fontSize(14).text('Medications', { underline: true });
			doc.fontSize(11);
			for (const med of medications) {
				doc.text(`• ${med.medication_name} - ${med.dosage} (${med.frequency})`);
			}
			doc.moveDown();
		}
	} catch (error) {
		logger.warn(`Failed to fetch medications: ${error.message}`);
	}

	try {
		const { data: appointments } = await sb()
			.from('appointments')
			.select('*')
			.eq('user_id', userId)
			.order('appointment_date', { ascending: false });
		if (appointments?.length) {
			doc.fontSize(14).text('Recent appointments', { underline: true });
			doc.fontSize(11);
			for (const apt of appointments.slice(0, 10)) {
				doc.text(`• ${apt.appointment_date} ${apt.appointment_time || ''} - ${apt.type}`);
			}
			doc.moveDown();
		}
	} catch (error) {
		logger.warn(`Failed to fetch appointments: ${error.message}`);
	}

	doc.end();
}

async function exportLabResultsAsPDF(userId, res) {
	const doc = new PDFDocument();
	const filename = `lab-results-${userId}-${Date.now()}.pdf`;

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

	doc.pipe(res);

	doc.fontSize(20).text('Lab Results Export', { align: 'center' });
	doc.fontSize(12).text(`User ID: ${userId}`, { align: 'center' });
	doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
	doc.moveDown();

	try {
		const { data: labResults } = await sb()
			.from('lab_results')
			.select('*')
			.eq('user_id', userId)
			.order('test_date', { ascending: false });

		if (labResults?.length) {
			doc.fontSize(14).text('Lab Results', { underline: true });
			doc.fontSize(11);
			for (const result of labResults) {
				doc.text(`Test: ${result.test_name}`);
				doc.text(`Date: ${result.test_date}`);
				doc.text(`Result: ${result.result_value} ${result.unit || ''}`);
				doc.text(`Reference Range: ${result.reference_range || 'N/A'}`);
				doc.moveDown(0.5);
			}
		} else {
			doc.text('No lab results found.');
		}
	} catch (error) {
		logger.warn(`Failed to fetch lab results: ${error.message}`);
		doc.text('Unable to fetch lab results.');
	}

	doc.end();
}

async function exportMedicationsAsCSV(userId, res) {
	const { data: medications } = await sb().from('prescriptions').select('*').eq('user_id', userId);

	const csvData = (medications || []).map((med) => ({
		'Medication Name': med.medication_name,
		Dosage: med.dosage,
		Frequency: med.frequency,
		Quantity: med.quantity,
		'Refills Remaining': med.refills_remaining,
		Status: med.status,
		'Date Prescribed': med.date_prescribed,
	}));

	const csv = generateCSV(csvData);
	const filename = `medications-${userId}-${Date.now()}.csv`;

	res.setHeader('Content-Type', 'text/csv');
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	res.send(csv);
}

async function exportAppointmentsAsCSV(userId, res) {
	const { data: appointments } = await sb()
		.from('appointments')
		.select('*')
		.eq('user_id', userId)
		.order('appointment_date', { ascending: false });

	const csvData = (appointments || []).map((apt) => ({
		Date: apt.appointment_date,
		Time: apt.appointment_time,
		Type: apt.type,
		Reason: apt.reason,
		Status: apt.status,
	}));

	const csv = generateCSV(csvData);
	const filename = `appointments-${userId}-${Date.now()}.csv`;

	res.setHeader('Content-Type', 'text/csv');
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	res.send(csv);
}

async function exportWellnessActivitiesAsCSV(userId, res) {
	const { data: activities } = await sb()
		.from('wellness_activities')
		.select('*')
		.eq('user_id', userId)
		.order('activity_date', { ascending: false });

	const csvData = (activities || []).map((activity) => ({
		Date: activity.activity_date,
		'Activity Type': activity.activity_type,
		'Duration (minutes)': activity.duration_minutes,
		Intensity: activity.intensity,
		'Calories Burned': activity.calories_burned,
		Notes: activity.notes,
	}));

	const csv = generateCSV(csvData);
	const filename = `wellness-activities-${userId}-${Date.now()}.csv`;

	res.setHeader('Content-Type', 'text/csv');
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	res.send(csv);
}

export default router;
