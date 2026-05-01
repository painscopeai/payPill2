import 'dotenv/config';
import logger from './logger.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';

const sb = () => getSupabaseAdmin();

/**
 * Fetch and prepare patient health data for AI analysis
 */
export async function preparePatientDataForAnalysis(patientId) {
	const healthData = {
		patient_id: patientId,
		age: null,
		gender: null,
		conditions: [],
		medications: [],
		allergies: [],
		vitals: {},
		lifestyle: {},
		family_history: [],
		health_goals: [],
		recent_appointments: [],
		lab_results: [],
	};

	try {
		const { data: profile } = await sb().from('profiles').select('*').eq('id', patientId).maybeSingle();
		if (profile?.date_of_birth) {
			const dob = new Date(profile.date_of_birth);
			if (!Number.isNaN(dob.getTime())) {
				healthData.age = new Date().getFullYear() - dob.getFullYear();
			}
		}
		healthData.gender = profile?.gender || null;

		const { data: steps } = await sb()
			.from('patient_onboarding_steps')
			.select('step, data')
			.eq('user_id', patientId);

		for (const row of steps || []) {
			const d = row.data || {};
			if (row.step === 1 || row.step === 2) {
				if (d.conditions && Array.isArray(d.conditions)) {
					healthData.conditions.push(...d.conditions.map((c) => c.name || c.condition_name || JSON.stringify(c)));
				}
				if (d.allergies && Array.isArray(d.allergies)) {
					healthData.allergies.push(...d.allergies.map((a) => a.allergen_name || a.name || JSON.stringify(a)));
				}
			}
			if (row.step === 4 && Array.isArray(d.conditions)) {
				healthData.conditions.push(...d.conditions.map((c) => c.name || c.condition_name || JSON.stringify(c)));
			}
			if (row.step === 6 && Array.isArray(d.allergies)) {
				healthData.allergies.push(...d.allergies.map((a) => a.allergen_name || a.name || JSON.stringify(a)));
			}
			if (row.step === 7 && Array.isArray(d.family_history)) {
				healthData.family_history.push(...d.family_history.map((h) => h.condition || JSON.stringify(h)));
			}
			if (row.step === 8) {
				healthData.lifestyle = {
					smoking_status: d.smoking_status || 'unknown',
					alcohol_consumption: d.alcohol_consumption || 'unknown',
					exercise_level: d.exercise_level || 'unknown',
					sleep_quality: d.sleep_quality || 'unknown',
				};
			}
			if (row.step === 9) {
				healthData.vitals = { ...healthData.vitals, ...d };
			}
		}

		const { data: medications } = await sb()
			.from('prescriptions')
			.select('*')
			.eq('user_id', patientId)
			.eq('status', 'active');

		healthData.medications = (medications || []).map((med) => ({
			name: med.medication_name,
			dosage: med.dosage,
			frequency: med.frequency,
		}));

		const { data: healthGoals } = await sb()
			.from('health_goals')
			.select('*')
			.eq('user_id', patientId)
			.eq('status', 'active');

		healthData.health_goals = (healthGoals || []).map((goal) => ({
			name: goal.goal_name,
			type: goal.goal_type,
			target_value: goal.target_value,
		}));

		const { data: appointments } = await sb()
			.from('appointments')
			.select('*')
			.eq('user_id', patientId)
			.order('appointment_date', { ascending: false })
			.limit(5);

		healthData.recent_appointments = (appointments || []).map((apt) => ({
			date: apt.appointment_date,
			type: apt.type,
			reason: apt.reason,
		}));

		const { data: labResults } = await sb()
			.from('lab_results')
			.select('*')
			.eq('user_id', patientId)
			.order('test_date', { ascending: false })
			.limit(10);

		healthData.lab_results = (labResults || []).map((result) => ({
			test_name: result.test_name,
			result_value: result.result_value,
			unit: result.unit,
			reference_range: result.reference_range,
			test_date: result.test_date,
		}));
	} catch (error) {
		logger.warn(`Error preparing patient data for analysis: ${error.message}`);
	}

	return healthData;
}

export function formatHealthDataForPrompt(healthData) {
	const lines = [];

	lines.push('=== PATIENT HEALTH PROFILE ===');
	lines.push(`Age: ${healthData.age || 'Not provided'}`);
	lines.push(`Gender: ${healthData.gender || 'Not provided'}`);
	lines.push('');

	if (healthData.conditions.length > 0) {
		lines.push('Current Conditions:');
		healthData.conditions.forEach((condition) => {
			lines.push(`  - ${condition}`);
		});
		lines.push('');
	}

	if (healthData.medications.length > 0) {
		lines.push('Current Medications:');
		healthData.medications.forEach((med) => {
			lines.push(`  - ${med.name} ${med.dosage} (${med.frequency})`);
		});
		lines.push('');
	}

	if (healthData.allergies.length > 0) {
		lines.push('Allergies:');
		healthData.allergies.forEach((allergy) => {
			lines.push(`  - ${allergy}`);
		});
		lines.push('');
	}

	if (Object.keys(healthData.vitals).length > 0) {
		lines.push('Latest Vital Signs / measurements:');
		lines.push(JSON.stringify(healthData.vitals));
		lines.push('');
	}

	if (healthData.family_history.length > 0) {
		lines.push('Family Medical History:');
		healthData.family_history.forEach((history) => {
			lines.push(`  - ${history}`);
		});
		lines.push('');
	}

	if (healthData.health_goals.length > 0) {
		lines.push('Health Goals:');
		healthData.health_goals.forEach((goal) => {
			lines.push(`  - ${goal.name} (${goal.type})`);
		});
		lines.push('');
	}

	if (healthData.lifestyle && Object.keys(healthData.lifestyle).length > 0) {
		lines.push('Lifestyle Factors:');
		lines.push(`  - Smoking: ${healthData.lifestyle.smoking_status}`);
		lines.push(`  - Alcohol: ${healthData.lifestyle.alcohol_consumption}`);
		lines.push(`  - Exercise: ${healthData.lifestyle.exercise_level}`);
		lines.push(`  - Sleep: ${healthData.lifestyle.sleep_quality}`);
		lines.push('');
	}

	return lines.join('\n');
}
