/**
 * Maps UI focus areas to stable keys and returns Gemini instruction blocks.
 */
const FOCUS_KEYS = new Set(['general', 'medications', 'lifestyle', 'preventive']);

export function normalizeFocusArea(raw) {
	const s = String(raw || 'general').toLowerCase().trim();
	return FOCUS_KEYS.has(s) ? s : 'general';
}

/**
 * User-facing label for logging / optional metadata.
 */
export function focusAreaLabel(key) {
	switch (key) {
		case 'medications':
			return 'Review Medication Interactions';
		case 'lifestyle':
			return 'Lifestyle Optimization';
		case 'preventive':
			return 'Preventive Care Check';
		default:
			return 'Analyze Current Health Status';
	}
}

/**
 * Long instruction block: the model must center all analysis and every recommendation on this theme.
 */
export function getFocusInstructionBlock(focusKey) {
	switch (focusKey) {
		case 'medications':
			return `FOCUS (required): "Review Medication Interactions"
- Center every recommendation on medications: safety, possible interactions among listed drugs, overlap with conditions and allergies, adherence, side effects to watch, when to ask a pharmacist or prescriber, and deprescribing or monitoring where appropriate.
- Do not give generic lifestyle advice unless it directly supports medication safety or adherence.`;
		case 'lifestyle':
			return `FOCUS (required): "Lifestyle Optimization"
- Center every recommendation on daily habits: nutrition, physical activity, sleep, stress, alcohol/tobacco, and behavior change tied to the user's conditions and goals.
- Minimize pure medication-dosing advice unless it supports lifestyle (e.g. timing with meals).`;
		case 'preventive':
			return `FOCUS (required): "Preventive Care Check"
- Center every recommendation on prevention: age- and risk-appropriate screenings, immunizations, follow-up intervals, early warning signs, and primary prevention.
- Emphasize what to schedule or discuss with a clinician rather than detailed treatment plans.`;
		default:
			return `FOCUS (required): "Analyze Current Health Status"
- Give a balanced overview: integrate conditions, medications, allergies, vitals, lifestyle, and recent records.
- Vary recommendation types (clinical, lifestyle, follow-up) as appropriate to the data.`;
	}
}

export const AI_SAFETY_FOOTER =
	'Output must be a JSON array only. This is educational decision support, not a diagnosis; recommend consulting a qualified clinician for medical decisions.';
