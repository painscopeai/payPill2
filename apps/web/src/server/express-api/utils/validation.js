/**
 * Validation rules for patient onboarding (14-step PayPill UI).
 * Must stay aligned with components under components/onboarding/.
 */

const stepValidation = {
	1: {
		name: 'Welcome & Profile Setup',
		required: ['first_name', 'last_name', 'phone', 'terms_acceptance'],
		optional: [
			'preferred_username',
			'preferred_language',
			'communication_preference',
			'privacy_preferences',
			'account_two_factor',
		],
	},
	2: {
		name: 'Demographics',
		required: ['date_of_birth', 'sex_assigned_at_birth'],
		optional: [
			'age',
			'gender_identity',
			'marital_status',
			'ethnicity',
			'race',
			'blood_group',
			'genotype',
			'pregnancy_status',
			'breastfeeding_status',
			'menstrual_status',
			'menopause_status',
			'disability_slugs',
		],
	},
	3: {
		name: 'Body Measurements & Vitals',
		required: [],
		optional: [
			'height',
			'weight',
			'height_unit',
			'weight_unit',
			'bmi',
			'resting_heart_rate',
			'blood_pressure_systolic',
			'blood_pressure_diastolic',
			'oxygen_saturation',
			'body_temperature',
			'respiratory_rate',
			'blood_sugar_baseline',
			'waist_circumference',
			'hip_circumference',
		],
	},
	4: {
		name: 'Pre-existing Conditions',
		required: [],
		optional: ['conditions_by_category', 'conditions_notes', 'conditions_list'],
	},
	5: {
		name: 'Current Medications',
		required: [],
		optional: ['medications_list', 'medication_tags'],
	},
	6: {
		name: 'Allergies',
		required: [],
		optional: ['allergies_list', 'allergy_details', 'allergy_type_slugs', 'allergy_severity'],
	},
	7: {
		name: 'Family Medical History',
		required: [],
		optional: ['family_history', 'family_conditions_slugs'],
	},
	8: {
		name: 'Surgical History',
		required: [],
		optional: ['surgeries'],
	},
	9: {
		name: 'Immunizations',
		required: [],
		optional: ['immunizations', 'immunization_selected', 'immunization_slugs'],
	},
	10: {
		name: 'Lab History',
		required: [],
		optional: ['labs', 'lab_selected', 'lab_slugs'],
	},
	11: {
		name: 'Lifestyle & Habits',
		required: [],
		optional: [
			'lifestyle',
			'exercise_level',
			'smoking_status',
			'alcohol_use',
			'substance_use',
			'diet_pattern',
			'sleep_quality',
			'stress_level',
		],
	},
	12: {
		name: 'Healthcare Providers',
		required: [],
		optional: ['providers', 'provider_notes', 'primary_provider_type', 'specialist_type', 'facility_type'],
	},
	13: {
		name: 'Health Insurance',
		required: [],
		optional: ['insurance', 'insurance_coverage_type', 'insurance_carrier', 'coverage_notes', 'coverage_areas_slugs'],
	},
	14: {
		name: 'Review & Consents',
		required: [],
		optional: ['consent_accuracy', 'consent_processing', 'consent_hipaa'],
	},
};

function hasTruthy(d, field) {
	const v = d[field];
	if (v === true) return true;
	if (typeof v === 'string' && v.trim() !== '') return true;
	return false;
}

/**
 * @param {number} step - Step number (1-14)
 * @param {object} data
 */
export function validateStep(step, data) {
	const errors = [];
	const d = data && typeof data === 'object' ? data : {};

	if (!stepValidation[step]) {
		return {
			valid: false,
			errors: [`Invalid step number: ${step}. Must be between 1 and 14.`],
		};
	}

	const validation = stepValidation[step];

	for (const field of validation.required) {
		if (field === 'terms_acceptance') {
			if (!d[field]) {
				errors.push(`Missing required field: ${field}`);
			}
			continue;
		}
		if (!hasTruthy(d, field)) {
			errors.push(`Missing required field: ${field}`);
		}
	}

	if (step === 1 && d.phone && typeof d.phone === 'string' && d.phone.trim().length < 7) {
		errors.push('phone appears invalid');
	}

	if (step === 2 && d.date_of_birth) {
		const dob = new Date(d.date_of_birth);
		if (isNaN(dob.getTime())) {
			errors.push('Invalid date_of_birth format. Use YYYY-MM-DD.');
		} else {
			const age = new Date().getFullYear() - dob.getFullYear();
			if (age < 0 || age > 120) {
				errors.push('Invalid age range for date of birth.');
			}
		}
	}

	if (step === 3) {
		if (d.height && isNaN(parseFloat(String(d.height)))) {
			errors.push('height must be a valid number.');
		}
		if (d.weight && isNaN(parseFloat(String(d.weight)))) {
			errors.push('weight must be a valid number.');
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * @param {object} allData - Keys step1..step14 or step_1..step_14
 */
export function validateAllSteps(allData) {
	const errors = {};

	for (let step = 1; step <= 13; step++) {
		const stepData =
			allData[`step${step}`] ||
			allData[`step_${step}`] ||
			{};
		const validation = validateStep(step, stepData);
		if (!validation.valid) {
			errors[`step${step}`] = validation.errors;
		}
	}

	return {
		valid: Object.keys(errors).length === 0,
		errors,
	};
}

export { stepValidation };
