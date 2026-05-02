/**
 * Generates supabase/migrations/20260508120100_profile_option_catalog_seed.sql
 * Run: node scripts/generate-profile-option-seed.mjs
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../supabase/migrations/20260508120100_profile_option_catalog_seed.sql');

/** @type {Array<{key:string,label:string,group:string,order:number,values:Array<{slug:string,label:string}>}>} */
const SETS = [];

function addSet(key, label, group, order, values) {
	SETS.push({
		key,
		label,
		group_slug: group,
		sort_order: order,
		values: values.map((v, i) => (typeof v === 'string' ? { slug: slugify(v), label: v } : { slug: v.slug, label: v.label, order: v.order })).map((v, i) => ({
			slug: v.slug,
			label: v.label,
			sort_order: v.order ?? (i + 1) * 10,
		})),
	});
}

function slugify(s) {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80);
}

// --- Welcome / profile ---
addSet('preferred_language', 'Preferred language', 'welcome', 10, [
	'English',
	'Spanish',
	'French',
	'Mandarin',
	'Hindi',
	'Arabic',
	'Portuguese',
	'Tagalog',
	'Vietnamese',
	'Korean',
	'Other',
]);
addSet('communication_preference', 'Communication preference', 'welcome', 20, ['SMS', 'Email', 'Push', 'Phone call']);
addSet('account_two_factor', 'Two-factor authentication', 'welcome', 30, ['Not enabled', 'SMS', 'Authenticator app']);

// Demographics
addSet('sex_assigned_at_birth', 'Sex assigned at birth', 'demographics', 10, [
	'Female',
	'Male',
	'Intersex',
	'Prefer not to say',
]);
addSet('gender_identity', 'Gender identity', 'demographics', 20, [
	'Woman',
	'Man',
	'Non-binary',
	'Prefer to self-describe',
	'Prefer not to say',
]);
addSet('marital_status', 'Marital status', 'demographics', 30, [
	'Single',
	'Married',
	'Divorced',
	'Widowed',
	'Domestic partnership',
	'Prefer not to say',
]);
addSet('ethnicity', 'Ethnicity (Hispanic/Latino)', 'demographics', 40, ['Hispanic or Latino', 'Not Hispanic or Latino', 'Prefer not to say']);
addSet(
	'race',
	'Race',
	'demographics',
	50,
	['American Indian or Alaska Native', 'Asian', 'Black or African American', 'Native Hawaiian or Pacific Islander', 'White', 'More than one race', 'Prefer not to say'],
);
addSet('blood_group', 'Blood group', 'demographics', 60, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']);
addSet('genotype', 'Sickle cell genotype', 'demographics', 70, ['AA', 'AS', 'SS', 'AC', 'SC', 'Unknown']);
addSet('pregnancy_status', 'Pregnancy status', 'demographics', 80, ['Not pregnant', 'Pregnant', 'Unknown', 'Not applicable']);
addSet('breastfeeding_status', 'Breastfeeding', 'demographics', 90, ['Yes', 'No', 'Unknown', 'Not applicable']);
addSet('menstrual_status', 'Menstrual status', 'demographics', 100, ['Regular', 'Irregular', 'Amenorrhea', 'Not applicable']);
addSet('menopause_status', 'Menopause status', 'demographics', 110, ['Pre-menopause', 'Peri-menopause', 'Post-menopause', 'Not applicable']);

const disabilities = ['Vision impairment', 'Hearing impairment', 'Mobility limitation', 'Speech impairment', 'Cognitive support needs', 'None'];
addSet('disability_support', 'Disability / accessibility (multi-select in UI)', 'demographics', 120, disabilities);

// Vitals / units
addSet('height_unit', 'Height unit', 'vitals', 10, ['cm', 'ft-in']);
addSet('weight_unit', 'Weight unit', 'vitals', 20, ['kg', 'lb']);

// Conditions (taxonomy slices)
const conditionSets = [
	[
		'conditions_cardiovascular',
		'Cardiovascular conditions',
		[
			'Hypertension',
			'Heart failure',
			'Coronary artery disease',
			'Arrhythmia',
			'Stroke history',
			'Peripheral vascular disease',
			'High cholesterol',
		],
	],
	[
		'conditions_endocrine',
		'Endocrine / metabolic conditions',
		[
			'Type 1 diabetes',
			'Type 2 diabetes',
			'Prediabetes',
			'Thyroid disorders',
			'Obesity',
			'Metabolic syndrome',
			'Gout',
		],
	],
	[
		'conditions_kidney',
		'Kidney / urinary conditions',
		[
			'Chronic kidney disease',
			'Kidney stones',
			'Nephrotic syndrome',
			'Urinary tract disorders',
			'Proteinuria',
			'Dialysis history',
		],
	],
	[
		'conditions_respiratory',
		'Respiratory conditions',
		['Asthma', 'COPD', 'Tuberculosis history', 'Sleep apnea', 'Chronic bronchitis', 'Pulmonary fibrosis'],
	],
	[
		'conditions_neurological',
		'Neurological conditions',
		['Epilepsy', 'Migraine', "Parkinson's disease", 'Multiple sclerosis', 'Dementia', 'Neuropathy'],
	],
	[
		'conditions_mental_health',
		'Mental health conditions',
		['Anxiety disorder', 'Depression', 'Bipolar disorder', 'PTSD', 'ADHD', 'Schizophrenia', 'Substance use disorder'],
	],
	[
		'conditions_gi',
		'Gastrointestinal conditions',
		['Peptic ulcer disease', 'GERD', 'IBS', "Crohn's disease", 'Ulcerative colitis', 'Liver disease', 'Hepatitis'],
	],
	[
		'conditions_msk',
		'Musculoskeletal conditions',
		['Arthritis', 'Osteoporosis', 'Chronic back pain', 'Fibromyalgia', 'Lupus', 'Joint replacement history'],
	],
	[
		'conditions_cancer',
		'Cancer / oncology',
		[
			'Breast cancer',
			'Prostate cancer',
			'Cervical cancer',
			'Colon cancer',
			'Leukemia',
			'Lymphoma',
			'Cancer survivor',
		],
	],
	[
		'conditions_infectious',
		'Infectious disease history',
		['HIV', 'Hepatitis B', 'Hepatitis C', 'Malaria recurrence', 'Tuberculosis', 'COVID-19 complications'],
	],
	[
		'conditions_autoimmune',
		'Autoimmune / immune',
		['Rheumatoid arthritis', 'Psoriasis', 'Sickle cell disease', 'Immunodeficiency', 'Celiac disease'],
	],
	[
		'conditions_womens_health',
		"Women's health",
		['PCOS', 'Endometriosis', 'Fibroids', 'Pregnancy-induced hypertension', 'Gestational diabetes history'],
	],
	[
		'conditions_mens_health',
		"Men's health",
		['Benign prostatic hyperplasia', 'Erectile dysfunction', 'Prostatitis', 'Testosterone deficiency'],
	],
	[
		'conditions_other',
		'Other medical history',
		['Organ transplant', 'Blood transfusion history', 'Frequent hospitalization', 'Chronic pain disorder', 'Rare disease'],
	],
];

let ord = 10;
for (const [key, label, vals] of conditionSets) {
	addSet(key, label, 'conditions', ord, vals);
	ord += 10;
}

addSet('condition_severity', 'Condition severity', 'conditions', 500, ['Mild', 'Moderate', 'Severe', 'Unknown']);

// Medication classes (representative)
const medClasses = [
	['med_class_diabetes', 'Diabetes medications', ['Metformin', 'Insulin', 'Empagliflozin', 'Dapagliflozin', 'Sitagliptin', 'Sulfonylureas']],
	['med_class_bp', 'Blood pressure medications', ['Labetalol', 'Amlodipine', 'Losartan', 'Lisinopril', 'Hydrochlorothiazide', 'Atenolol']],
	[
		'med_class_cardiac_lipid',
		'Heart / cholesterol',
		['Atorvastatin', 'Simvastatin', 'Aspirin', 'Clopidogrel', 'Furosemide', 'Spironolactone', 'Warfarin'],
	],
	['med_class_respiratory', 'Respiratory', ['Salbutamol', 'Budesonide', 'Montelukast', 'Prednisolone', 'Inhaled corticosteroids']],
	['med_class_pain', 'Pain / inflammation', ['Paracetamol', 'Ibuprofen', 'Diclofenac', 'Tramadol', 'Naproxen']],
	['med_class_antibiotic', 'Antibiotics / anti-infectives', ['Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Metronidazole', 'Antifungals', 'Antivirals']],
	['med_class_mental_health', 'Mental health meds', ['Sertraline', 'Fluoxetine', 'Amitriptyline', 'Diazepam', 'Antipsychotics', 'Mood stabilizers']],
	['med_class_gi', 'Gastrointestinal', ['Omeprazole', 'Antacids', 'Laxatives', 'Anti-diarrheals']],
	['med_class_hormonal', 'Hormonal / reproductive', ['Oral contraceptives', 'HRT', 'Fertility medication', 'Thyroid hormone']],
	['med_class_supplements', 'Supplements / OTC', ['Iron', 'Vitamin D', 'Calcium', 'Multivitamins', 'Herbal']],
];
ord = 10;
for (const [key, label, vals] of medClasses) {
	addSet(key, label, 'medications', ord, vals);
	ord += 10;
}

addSet('medication_route', 'Medication route', 'medications', 500, ['Oral', 'IV', 'Subcutaneous', 'Topical', 'Inhaled', 'Other']);
addSet('medication_frequency', 'Frequency (examples)', 'medications', 510, ['Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Weekly', 'Other']);

// Allergies
addSet('allergy_type', 'Allergy type', 'allergies', 10, ['Drug', 'Food', 'Environmental', 'Other']);
addSet('allergy_severity', 'Allergy reaction severity', 'allergies', 20, ['Mild', 'Moderate', 'Severe', 'Unknown']);

// Family history (common)
addSet(
	'family_history_conditions',
	'Family history — conditions',
	'family_history',
	10,
	['Diabetes', 'Hypertension', 'Cancer', 'Kidney disease', 'Heart disease', 'Stroke', 'Sickle cell disease', 'Mental health conditions'],
);

// Immunizations
addSet(
	'immunization_vaccines',
	'Vaccines',
	'immunizations',
	10,
	['COVID-19', 'Tetanus', 'Hepatitis B', 'Influenza', 'MMR', 'Varicella', 'Polio', 'Other'],
);

// Labs
addSet(
	'lab_tests',
	'Lab tests',
	'labs',
	10,
	['Blood glucose', 'HbA1c', 'Creatinine', 'eGFR', 'Lipid profile', 'Urinalysis', 'Liver panel', 'TSH', 'Other'],
);

// Lifestyle
addSet('exercise_level', 'Physical activity level', 'lifestyle', 10, ['None', 'Light', 'Moderate', 'Intense', 'Prefer not to say']);
addSet('smoking_status', 'Smoking / tobacco', 'lifestyle', 20, [
	'Never smoked',
	'Former smoker',
	'Current smoker',
	'Occasionally',
	'Vaping',
	'Smokeless tobacco',
	'Prefer not to say',
]);
addSet('alcohol_use', 'Alcohol use', 'lifestyle', 30, ['Never', 'Occasionally', 'Weekly', 'Daily', 'Heavy use', 'Prefer not to say']);
addSet('substance_use', 'Substance use', 'lifestyle', 40, ['None', 'Recreational drugs', 'Prescription misuse', 'Cannabis', 'Opioid use', 'Other', 'Prefer not to say']);
addSet(
	'diet_pattern',
	'Diet pattern',
	'lifestyle',
	50,
	['No restriction', 'Vegetarian', 'Vegan', 'Low salt', 'Low sugar', 'Renal diet', 'High protein', 'Other'],
);
addSet('sleep_quality', 'Sleep quality', 'lifestyle', 60, ['Poor', 'Fair', 'Good', 'Excellent']);
addSet('stress_level', 'Stress level', 'lifestyle', 70, ['Low', 'Medium', 'High']);

// Providers
addSet(
	'provider_type_primary',
	'Primary care provider types',
	'providers',
	10,
	['Family physician', 'General practitioner', 'Internist', 'Pediatrician'],
);
addSet(
	'provider_type_specialist',
	'Specialist types',
	'providers',
	20,
	[
		'Nephrologist',
		'Cardiologist',
		'Endocrinologist',
		'Neurologist',
		'Pulmonologist',
		'Gastroenterologist',
		'Oncologist',
		'Psychiatrist',
		'Dermatologist',
		'Orthopedic',
		'Gynecologist',
		'Urologist',
		'Other',
	],
);
addSet(
	'provider_type_allied',
	'Allied health',
	'providers',
	30,
	['Pharmacist', 'Physiotherapist', 'Dietitian', 'Psychologist', 'Occupational therapist', 'Speech therapist', 'Other'],
);
addSet(
	'facility_type',
	'Facility type',
	'providers',
	40,
	['Hospital', 'Clinic', 'Laboratory', 'Imaging center', 'Dialysis center', 'Urgent care', 'Other'],
);

// Insurance
addSet(
	'insurance_coverage_type',
	'Insurance coverage type',
	'insurance',
	10,
	[
		'Private insurance',
		'Employer-sponsored',
		'Government insurance',
		'Medicaid',
		'Medicare',
		'HMO',
		'PPO',
		'EPO',
		'POS',
		'Self-pay / uninsured',
	],
);
addSet(
	'insurance_carrier',
	'Insurance carrier (examples)',
	'insurance',
	20,
	[
		'Blue Cross Blue Shield',
		'Aetna',
		'Cigna',
		'UnitedHealthcare',
		'Humana',
		'Kaiser Permanente',
		'Regional / local plan',
		'Other',
	],
);
addSet(
	'coverage_area',
	'Coverage areas',
	'insurance',
	30,
	[
		'Primary insurance',
		'Secondary insurance',
		'Prescription',
		'Dental',
		'Vision',
		'Specialist',
		'Lab',
		'Emergency',
	],
);

// Emergency contact
addSet(
	'emergency_contact_relationship',
	'Emergency contact relationship',
	'emergency',
	10,
	['Parent', 'Spouse', 'Sibling', 'Friend', 'Guardian', 'Partner', 'Other'],
);

let sql = `-- Seed profile option sets (generated by scripts/generate-profile-option-seed.mjs)\n\n`;

for (const s of SETS) {
	sql += `insert into public.profile_option_sets (key, label, group_slug, sort_order, active, description)\n`;
	sql += `values (${esc(s.key)}, ${esc(s.label)}, ${esc(s.group_slug)}, ${s.sort_order}, true, null)\n`;
	sql += `on conflict (key) do nothing;\n\n`;
}

sql += `-- Values\n`;
for (const s of SETS) {
	sql += `insert into public.profile_option_values (set_id, slug, label, sort_order, active)\n`;
	sql += `select s.id, v.slug, v.label, v.ord, true\n`;
	sql += `from public.profile_option_sets s\n`;
	sql += `cross join (values\n`;
	const rows = s.values.map((v) => `  (${esc(v.slug)}, ${esc(v.label)}, ${v.sort_order})`).join(',\n');
	sql += `${rows}\n) as v(slug, label, ord)\n`;
	sql += `where s.key = ${esc(s.key)}\n`;
	sql += `on conflict (set_id, slug) do nothing;\n\n`;
}

function esc(str) {
	return "'" + String(str).replace(/'/g, "''") + "'";
}

writeFileSync(outPath, sql, 'utf8');
console.log('Wrote', outPath, 'sets:', SETS.length);
