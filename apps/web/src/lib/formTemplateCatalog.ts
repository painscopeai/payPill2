/**
 * Built-in templates (marketing cards). Cloned into real `forms` + `form_questions` rows on use.
 */
export type TemplateQuestion = {
	question_text: string;
	question_type: string;
	options_json?: string[];
	required?: boolean;
	sort_order: number;
	config?: Record<string, unknown>;
};

export type FormTemplateDefinition = {
	id: string;
	name: string;
	description: string;
	form_type: string;
	category: string;
	settings: Record<string, unknown>;
	questions: TemplateQuestion[];
	/**
	 * Shown in the templates modal for guidance only. Does not create a form via /forms/from-template
	 * (pricing rows use Provider Onboarding → post-questionnaire Services & pricing step).
	 */
	infoOnly?: boolean;
};

export const FORM_TEMPLATE_IDS = [
	'patient_health_assessment',
	'employer_wellness',
	'insurance_claim',
	'provider_feedback',
	'provider_services_menu',
	'consent_treatment_general',
	'consent_hipaa_acknowledgment',
	'consent_telehealth',
	'service_intake_visit',
] as const;

/** Templates providers may clone from the portal (subset of `FORM_TEMPLATE_CATALOG`). */
export const PROVIDER_PORTAL_TEMPLATE_IDS: readonly string[] = [
	'consent_treatment_general',
	'consent_hipaa_acknowledgment',
	'consent_telehealth',
	'service_intake_visit',
];

const defaultPresentation = {
	collect_email: true,
	allow_multiple_responses: false,
	confirmation_message: 'Your response has been recorded.',
	show_progress_bar: true,
	shuffle_questions: false,
	show_question_numbers: true,
	theme_header_color: 'hsl(221 83% 53%)',
};

export const FORM_TEMPLATE_CATALOG: Record<string, FormTemplateDefinition> = {
	patient_health_assessment: {
		id: 'patient_health_assessment',
		name: 'Patient Health Assessment',
		description: 'Standard intake form for new patients.',
		form_type: 'health_assessment',
		category: 'Intake',
		settings: { ...defaultPresentation },
		questions: [
			{
				sort_order: 0,
				question_text: 'What is your primary reason for visit today?',
				question_type: 'short_text',
				required: true,
			},
			{
				sort_order: 1,
				question_text: 'Do you have any known allergies to medications?',
				question_type: 'multiple_choice',
				options_json: ['No known allergies', 'Yes — I will describe below'],
				required: true,
			},
			{
				sort_order: 2,
				question_text: 'Please list current medications (or enter N/A).',
				question_type: 'long_text',
				required: false,
			},
			{
				sort_order: 3,
				question_text: 'Rate your overall health today (1 = poor, 5 = excellent).',
				question_type: 'linear_scale',
				required: true,
				config: { min: 1, max: 5, minLabel: 'Poor', maxLabel: 'Excellent' },
			},
		],
	},
	employer_wellness: {
		id: 'employer_wellness',
		name: 'Employer Wellness Survey',
		description: 'Gauge employee wellness and program interest.',
		form_type: 'employer_assessment',
		category: 'Employer',
		settings: { ...defaultPresentation, theme_header_color: 'hsl(142 71% 45%)' },
		questions: [
			{
				sort_order: 0,
				question_text: 'Which department do you work in?',
				question_type: 'dropdown',
				options_json: ['Operations', 'Clinical', 'Corporate', 'Other'],
				required: true,
			},
			{
				sort_order: 1,
				question_text: 'Which wellness topics interest you most?',
				question_type: 'checkboxes',
				options_json: ['Nutrition', 'Fitness', 'Mental health', 'Sleep'],
				required: false,
			},
			{
				sort_order: 2,
				question_text: 'Would you join a 6-week wellness challenge?',
				question_type: 'multiple_choice',
				options_json: ['Definitely', 'Maybe', 'Not interested'],
				required: true,
			},
		],
	},
	insurance_claim: {
		id: 'insurance_claim',
		name: 'Insurance Claim Form',
		description: 'Detailed form for submitting new claims.',
		form_type: 'insurance_assessment',
		category: 'Insurance',
		settings: { ...defaultPresentation, theme_header_color: 'hsl(270 85% 60%)' },
		questions: [
			{
				sort_order: 0,
				question_text: 'Policy holder full name',
				question_type: 'short_text',
				required: true,
			},
			{
				sort_order: 1,
				question_text: 'Claim type',
				question_type: 'multiple_choice',
				options_json: ['Medical', 'Pharmacy', 'Dental', 'Vision'],
				required: true,
			},
			{
				sort_order: 2,
				question_text: 'Date of service',
				question_type: 'date',
				required: true,
			},
			{
				sort_order: 3,
				question_text: 'Brief description of the claim',
				question_type: 'long_text',
				required: true,
			},
		],
	},
	provider_feedback: {
		id: 'provider_feedback',
		name: 'Provider Feedback',
		description: 'Post-appointment satisfaction survey.',
		form_type: 'provider_application',
		category: 'Provider',
		settings: { ...defaultPresentation, theme_header_color: 'hsl(38 92% 50%)' },
		questions: [
			{
				sort_order: 0,
				question_text: 'How satisfied were you with your visit?',
				question_type: 'linear_scale',
				required: true,
				config: { min: 1, max: 5, minLabel: 'Very dissatisfied', maxLabel: 'Very satisfied' },
			},
			{
				sort_order: 1,
				question_text: 'Would you recommend this provider to others?',
				question_type: 'multiple_choice',
				options_json: ['Definitely', 'Probably', 'Not sure', 'Probably not', 'Definitely not'],
				required: true,
			},
			{
				sort_order: 2,
				question_text: 'Additional comments (optional)',
				question_type: 'long_text',
				required: false,
			},
		],
	},
	provider_services_menu: {
		id: 'provider_services_menu',
		name: 'Provider services & pricing',
		description:
			'Service and medication prices are collected automatically on the step **after** your applicant submits the provider questionnaire—not as Form Builder questions. Send invitations from Provider Onboarding; after submit, applicants enter their pricing menu row-by-row.',
		form_type: 'custom',
		category: 'Provider',
		settings: {},
		questions: [],
		infoOnly: true,
	},
	consent_treatment_general: {
		id: 'consent_treatment_general',
		name: 'General treatment consent',
		description:
			'Acknowledgment of risks, benefits, alternatives, and voluntary agreement to care. Duplicate and customize for your practice.',
		form_type: 'consent',
		category: 'Consent',
		settings: { ...defaultPresentation, show_progress_bar: false, collect_email: true },
		questions: [
			{
				sort_order: 0,
				question_text:
					'I have read (or had explained to me) the nature, benefits, and material risks of the proposed treatment or services.',
				question_type: 'multiple_choice',
				options_json: ['I agree', 'I do not agree — I will contact the office'],
				required: true,
			},
			{
				sort_order: 1,
				question_text: 'I understand that no guarantee has been made regarding the outcome of treatment.',
				question_type: 'multiple_choice',
				options_json: ['I understand and agree', 'I have questions — I will contact the office'],
				required: true,
			},
			{
				sort_order: 2,
				question_text: 'Printed name (as signature acknowledgment)',
				question_type: 'short_text',
				required: true,
			},
			{
				sort_order: 3,
				question_text: 'Today’s date',
				question_type: 'date',
				required: true,
			},
		],
	},
	consent_hipaa_acknowledgment: {
		id: 'consent_hipaa_acknowledgment',
		name: 'HIPAA Notice of Privacy Practices',
		description: 'Patient acknowledgment of receipt of the Notice of Privacy Practices.',
		form_type: 'consent',
		category: 'Consent',
		settings: { ...defaultPresentation, show_progress_bar: false },
		questions: [
			{
				sort_order: 0,
				question_text:
					'I acknowledge that I have received a copy of (or access to) the Notice of Privacy Practices describing how my health information may be used and disclosed.',
				question_type: 'multiple_choice',
				options_json: ['I acknowledge', 'I need a copy sent to me'],
				required: true,
			},
			{
				sort_order: 1,
				question_text: 'Optional: preferred method to receive privacy notices',
				question_type: 'dropdown',
				options_json: ['Portal / email', 'Postal mail', 'In person only'],
				required: false,
			},
		],
	},
	consent_telehealth: {
		id: 'consent_telehealth',
		name: 'Telehealth consent',
		description: 'Consent for virtual visits, technology limitations, and privacy in the patient’s environment.',
		form_type: 'consent',
		category: 'Consent',
		settings: { ...defaultPresentation, show_progress_bar: true },
		questions: [
			{
				sort_order: 0,
				question_text:
					'I understand telehealth involves electronic communication and may have limitations compared to in-person care.',
				question_type: 'multiple_choice',
				options_json: ['I understand', 'I have questions — I will contact the office'],
				required: true,
			},
			{
				sort_order: 1,
				question_text:
					'I agree not to record the session without the clinician’s consent, and I will use a private location when possible.',
				question_type: 'checkboxes',
				options_json: ['I agree'],
				required: true,
			},
			{
				sort_order: 2,
				question_text: 'State / region where you will be located for the visit (if required by policy)',
				question_type: 'short_text',
				required: false,
			},
		],
	},
	service_intake_visit: {
		id: 'service_intake_visit',
		name: 'Service intake — visit reason & history',
		description: 'Short questionnaire patients can complete before a visit when attached to a service.',
		form_type: 'service_intake',
		category: 'Intake',
		settings: { ...defaultPresentation },
		questions: [
			{
				sort_order: 0,
				question_text: 'What is the main reason for this visit?',
				question_type: 'short_text',
				required: true,
			},
			{
				sort_order: 1,
				question_text: 'When did symptoms start (approximate)?',
				question_type: 'short_text',
				required: false,
			},
			{
				sort_order: 2,
				question_text: 'Current medications (or enter N/A)',
				question_type: 'long_text',
				required: true,
			},
			{
				sort_order: 3,
				question_text: 'Any new allergies since your last visit?',
				question_type: 'multiple_choice',
				options_json: ['No', 'Yes — details below'],
				required: true,
			},
			{
				sort_order: 4,
				question_text: 'If you answered Yes above, describe the allergy/reaction.',
				question_type: 'long_text',
				required: false,
			},
		],
	},
};
