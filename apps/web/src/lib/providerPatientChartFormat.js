/**
 * Human-readable labels for provider patient chart (onboarding JSON keys).
 * Keep loosely aligned with `server/express-api/utils/validation.js` step fields.
 */

/** @type {Record<string, string>} */
export const ONBOARDING_FIELD_LABELS = {
	first_name: 'First name',
	last_name: 'Last name',
	preferred_username: 'Preferred name',
	phone: 'Phone',
	email: 'Email',
	preferred_language: 'Preferred language',
	communication_preference: 'Communication preference',
	privacy_preferences: 'Privacy preferences',
	terms_acceptance: 'Terms accepted',
	account_two_factor: 'Two-factor authentication',
	date_of_birth: 'Date of birth',
	age: 'Age',
	sex_assigned_at_birth: 'Sex assigned at birth',
	gender_identity: 'Gender identity',
	marital_status: 'Marital status',
	ethnicity: 'Ethnicity',
	race: 'Race',
	blood_group: 'Blood group',
	genotype: 'Genotype',
	pregnancy_status: 'Pregnancy status',
	breastfeeding_status: 'Breastfeeding status',
	menstrual_status: 'Menstrual status',
	menopause_status: 'Menopause status',
	disability_slugs: 'Disabilities & access needs',
	height: 'Height',
	weight: 'Weight',
	height_unit: 'Height unit',
	weight_unit: 'Weight unit',
	bmi: 'BMI',
	resting_heart_rate: 'Resting heart rate',
	blood_pressure_systolic: 'Blood pressure (systolic)',
	blood_pressure_diastolic: 'Blood pressure (diastolic)',
	oxygen_saturation: 'Oxygen saturation',
	body_temperature: 'Body temperature',
	respiratory_rate: 'Respiratory rate',
	blood_sugar_baseline: 'Blood sugar (baseline)',
	waist_circumference: 'Waist circumference',
	hip_circumference: 'Hip circumference',
	conditions_by_category: 'Conditions by category',
	conditions_notes: 'Condition notes',
	conditions_list: 'Conditions list',
	medications_list: 'Medications',
	medication_tags: 'Medication tags',
	allergies_list: 'Allergies',
	allergy_details: 'Allergy details',
	allergy_type_slugs: 'Allergy types',
	allergy_severity: 'Allergy severity',
	family_history: 'Family history',
	family_conditions_slugs: 'Family conditions',
	surgeries: 'Surgical history',
	immunizations: 'Immunizations',
	immunization_selected: 'Immunizations selected',
	immunization_slugs: 'Immunization types',
	labs: 'Lab history',
	lab_selected: 'Labs selected',
	lab_slugs: 'Lab types',
	lifestyle: 'Lifestyle',
	exercise_level: 'Exercise level',
	smoking_status: 'Smoking status',
	alcohol_use: 'Alcohol use',
	substance_use: 'Substance use',
	diet_pattern: 'Diet pattern',
	sleep_quality: 'Sleep quality',
	stress_level: 'Stress level',
	providers: 'Healthcare providers',
	provider_notes: 'Provider notes',
	primary_provider_type: 'Primary provider type',
	specialist_type: 'Specialist type',
	facility_type: 'Facility type',
	insurance: 'Insurance details',
	insurance_coverage_type: 'Coverage type',
	insurance_carrier: 'Insurance carrier',
	coverage_notes: 'Coverage notes',
	coverage_areas_slugs: 'Coverage areas',
	consent_accuracy: 'Accuracy consent',
	consent_processing: 'Data processing consent',
	consent_hipaa: 'HIPAA / privacy consent',
};

/**
 * @param {string} key
 */
export function humanizeFieldKey(key) {
	if (!key || typeof key !== 'string') return 'Field';
	if (ONBOARDING_FIELD_LABELS[key]) return ONBOARDING_FIELD_LABELS[key];
	return key
		.replace(/_/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @param {string} slug
 */
export function humanizeSlug(slug) {
	if (!slug || typeof slug !== 'string') return '';
	return slug
		.split(/[-_]/g)
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(' ');
}

/**
 * @param {string} name
 */
export function formatPersonDisplayName(name) {
	if (!name || typeof name !== 'string') return '';
	return name
		.trim()
		.split(/\s+/)
		.map((w) => {
			if (!w) return '';
			if (w.length <= 3 && w === w.toUpperCase()) return w;
			return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
		})
		.join(' ');
}
