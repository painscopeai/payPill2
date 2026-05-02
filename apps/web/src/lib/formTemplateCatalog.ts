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
};

export const FORM_TEMPLATE_IDS = [
	'patient_health_assessment',
	'employer_wellness',
	'insurance_claim',
	'provider_feedback',
] as const;

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
};
