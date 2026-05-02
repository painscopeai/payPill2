/**
 * Derives AI prompt structures from patient_onboarding_steps rows (Supabase).
 */

export function buildPatientDataFromOnboardingRows(userId, rows) {
	const patientData = {
		userId,
		conditions: [],
		medications: [],
		allergies: [],
		medicalHistory: [],
		labHistory: [],
		lifestyle: {},
		immunizations: [],
		vitals: {},
		profile: null,
		rawOnboardingSummary: '',
	};

	if (!rows?.length) {
		return patientData;
	}

	const summaryLines = [];
	for (const row of rows) {
		const step = row.step;
		const d = row.data && typeof row.data === 'object' ? row.data : {};
		summaryLines.push(`Step ${step}: ${JSON.stringify(d)}`);

		switch (step) {
			case 1:
			case 2:
				patientData.profile = { ...(patientData.profile || {}), ...d };
				break;
			case 4:
				if (Array.isArray(d.conditions)) {
					d.conditions.forEach((c) =>
						patientData.conditions.push({
							name: c.condition_name || c.name || 'Condition',
							status: c.status || 'active',
							diagnosedDate: c.diagnosed_date,
						}),
					);
				} else if (d.condition_name || d.name) {
					patientData.conditions.push({
						name: d.condition_name || d.name,
						status: d.status || 'active',
						diagnosedDate: d.diagnosed_date,
					});
				}
				break;
			case 5:
				if (Array.isArray(d.medications)) {
					d.medications.forEach((m) =>
						patientData.medications.push({
							name: m.medication_name || m.name || 'Medication',
							dosage: m.dosage,
							frequency: m.frequency,
							status: m.status || 'active',
							startDate: m.start_date,
						}),
					);
				} else if (d.medication_name || d.name) {
					patientData.medications.push({
						name: d.medication_name || d.name,
						dosage: d.dosage,
						frequency: d.frequency,
						status: d.status || 'active',
						startDate: d.start_date,
					});
				}
				break;
			case 6:
				if (Array.isArray(d.allergies)) {
					d.allergies.forEach((a) =>
						patientData.allergies.push({
							allergen: a.allergen_name || a.name || 'Allergen',
							severity: a.severity || 'unknown',
							reaction: a.reaction,
						}),
					);
				} else if (d.allergen_name || d.name) {
					patientData.allergies.push({
						allergen: d.allergen_name || d.name,
						severity: d.severity || 'unknown',
						reaction: d.reaction,
					});
				}
				break;
			case 7:
				if (Array.isArray(d.history)) {
					d.history.forEach((h) =>
						patientData.medicalHistory.push({
							event: h.event_name || h.name || 'Event',
							date: h.event_date,
							description: h.description,
						}),
					);
				} else if (d.event_name || d.description) {
					patientData.medicalHistory.push({
						event: d.event_name || 'Medical history',
						date: d.event_date,
						description: d.description,
					});
				}
				break;
			case 8:
				patientData.lifestyle = {
					smokingStatus: d.smoking_status ?? d.smokingStatus,
					alcoholConsumption: d.alcohol_consumption ?? d.alcoholConsumption,
					exerciseLevel: d.exercise_level ?? d.exerciseLevel,
					sleepQuality: d.sleep_quality ?? d.sleepQuality,
					diet: d.diet,
					stress: d.stress_level ?? d.stress,
				};
				break;
			case 9:
				patientData.vitals = { ...patientData.vitals, ...d };
				break;
			case 10:
				patientData.profile = {
					...(patientData.profile || {}),
					health_goals: d.goals || d.health_goals || d,
				};
				break;
			default:
				break;
		}
	}

	patientData.rawOnboardingSummary = summaryLines.join('\n').slice(0, 12000);
	return patientData;
}

export function patientHasHealthSignals(patientData, recentHealthRecordCount = 0) {
	if (!patientData) return recentHealthRecordCount > 0;
	const summaryLen = (patientData.rawOnboardingSummary || '').length;
	return (
		recentHealthRecordCount > 0 ||
		patientData.conditions.length > 0 ||
		patientData.medications.length > 0 ||
		patientData.allergies.length > 0 ||
		patientData.labHistory.length > 0 ||
		patientData.medicalHistory.length > 0 ||
		Object.keys(patientData.lifestyle || {}).some((k) => patientData.lifestyle[k]) ||
		patientData.immunizations.length > 0 ||
		Object.keys(patientData.vitals || {}).length > 0 ||
		summaryLen > 120
	);
}
