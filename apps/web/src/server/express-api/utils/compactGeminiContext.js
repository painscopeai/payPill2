/**
 * Small, structured context for Gemini — avoids huge raw JSON dumps that slow models and cause timeouts.
 */

const MAX_TOTAL_CHARS = 14000;
const MAX_NOTE = 220;
const MAX_DESC = 280;

function clip(s, n) {
	if (s == null || s === '') return '';
	const t = String(s);
	return t.length <= n ? t : `${t.slice(0, n)}…`;
}

/**
 * @param {object} patientData — output of `buildPatientDataFromOnboardingRows`
 * @param {Array<Record<string, unknown>>} recentRecords
 */
export function buildCompactGeminiContext(patientData, recentRecords) {
	const lines = [];

	lines.push('=== PROFILE (onboarding, summarized) ===');

	if (patientData.profile) {
		const p = patientData.profile;
		const bits = [];
		if (p.age != null) bits.push(`Age: ${p.age}`);
		if (p.gender) bits.push(`Gender: ${clip(p.gender, 40)}`);
		if (p.health_goals) {
			const g =
				typeof p.health_goals === 'object'
					? clip(JSON.stringify(p.health_goals), 400)
					: clip(String(p.health_goals), 400);
			if (g) bits.push(`Goals: ${g}`);
		}
		if (bits.length) lines.push(bits.join(' | '), '');
	}

	if (patientData.conditions?.length) {
		lines.push('Conditions:');
		patientData.conditions.slice(0, 20).forEach((c) => {
			lines.push(`  - ${clip(c.name, 80)} (${c.status || 'unknown'})`);
		});
		lines.push('');
	}

	if (patientData.medications?.length) {
		lines.push('Medications:');
		patientData.medications.slice(0, 20).forEach((m) => {
			lines.push(
				`  - ${clip(m.name, 80)} ${m.dosage ? clip(m.dosage, 40) : ''} (${clip(m.frequency || 'as directed', 40)})`,
			);
		});
		lines.push('');
	}

	if (patientData.allergies?.length) {
		lines.push('Allergies:');
		patientData.allergies.slice(0, 15).forEach((a) => {
			lines.push(`  - ${clip(a.allergen, 60)} (${a.severity})`);
		});
		lines.push('');
	}

	if (patientData.labHistory?.length) {
		lines.push('Labs (recent):');
		patientData.labHistory.slice(0, 6).forEach((l) => {
			lines.push(`  - ${clip(l.testName, 50)}: ${clip(String(l.result), 40)} ${l.unit || ''} (${l.testDate || '?'})`);
		});
		lines.push('');
	}

	if (patientData.medicalHistory?.length) {
		lines.push('Medical history (snippets):');
		patientData.medicalHistory.slice(0, 4).forEach((h) => {
			lines.push(`  - ${clip(h.event, 60)} (${h.date || '?'}): ${clip(h.description, MAX_DESC)}`);
		});
		lines.push('');
	}

	const L = patientData.lifestyle || {};
	if (Object.keys(L).some((k) => L[k])) {
		lines.push('Lifestyle:', '');
		if (L.smokingStatus) lines.push(`  Smoking: ${clip(L.smokingStatus, 60)}`);
		if (L.alcoholConsumption) lines.push(`  Alcohol: ${clip(L.alcoholConsumption, 60)}`);
		if (L.exerciseLevel) lines.push(`  Exercise: ${clip(L.exerciseLevel, 60)}`);
		if (L.sleepQuality) lines.push(`  Sleep: ${clip(L.sleepQuality, 60)}`);
		if (L.diet) lines.push(`  Diet: ${clip(L.diet, 120)}`);
		if (L.stress) lines.push(`  Stress: ${clip(L.stress, 60)}`);
		lines.push('');
	}

	if (patientData.immunizations?.length) {
		lines.push('Immunizations:');
		patientData.immunizations.slice(0, 10).forEach((i) => {
			lines.push(`  - ${clip(i.vaccine, 60)} (${i.date || '?'})`);
		});
		lines.push('');
	}

	if (patientData.vitals && Object.keys(patientData.vitals).length > 0) {
		const vitStr = clip(JSON.stringify(patientData.vitals), 500);
		lines.push('Vitals/measurements:', vitStr, '');
	}

	if (recentRecords?.length) {
		lines.push('=== HEALTH RECORDS (last 24 hours, patient-entered) ===');
		recentRecords.slice(0, 25).forEach((r) => {
			lines.push(`- [${r.record_type}] ${clip(r.title, 120)}`);
			if (r.record_date) lines.push(`  date: ${r.record_date}`);
			if (r.status) lines.push(`  status: ${clip(r.status, 80)}`);
			if (r.provider_or_facility) lines.push(`  facility: ${clip(r.provider_or_facility, 80)}`);
			if (r.notes) lines.push(`  notes: ${clip(r.notes, MAX_NOTE)}`);
			lines.push('');
		});
	}

	let text = lines.join('\n').trim();
	if (text.length > MAX_TOTAL_CHARS) {
		text = `${text.slice(0, MAX_TOTAL_CHARS)}\n\n[Context truncated for length]`;
	}
	return text;
}
