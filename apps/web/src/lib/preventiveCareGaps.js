const PREVENTIVE_REC_PATTERN =
	/vaccin|flu|influenza|screen|prevent|lipid|cholesterol|physical|mammogram|colonoscopy|pap|immuniz|wellness|check-?up/i;

function parseDate(value) {
	if (!value) return null;
	const raw = String(value).trim();
	const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
	return Number.isNaN(d.getTime()) ? null : d;
}

function monthsSince(date) {
	if (!date) return Infinity;
	const now = new Date();
	return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
}

function getImmunizationVaccines(overview) {
	const rawSteps = overview?.raw?.onboardingSteps;
	if (!Array.isArray(rawSteps)) return [];
	const step9 = rawSteps.find((s) => Number(s.step) === 9);
	const vaccines = step9?.data?.vaccines;
	return Array.isArray(vaccines) ? vaccines : [];
}

function findLatestFluVaccine(vaccines) {
	let latest = null;
	for (const v of vaccines) {
		const name = String(v.vaccine_name || v.vaccineName || '').toLowerCase();
		if (!/flu|influenza/.test(name)) continue;
		const d = parseDate(v.date_administered || v.dateAdministered);
		if (d && (!latest || d > latest)) latest = d;
	}
	return latest;
}

function findLatestLipidTest(labResults) {
	let latest = null;
	for (const lab of labResults) {
		const name = String(lab.test_name || lab.testName || '').toLowerCase();
		if (!/lipid|cholesterol|hdl|ldl|triglyceride/.test(name)) continue;
		const d = parseDate(lab.test_date || lab.date_tested || lab.testDate);
		if (d && (!latest || d > latest)) latest = d;
	}
	return latest;
}

function priorityToStatus(priority) {
	const p = String(priority || '').toLowerCase();
	if (p === 'high') return 'Overdue';
	if (p === 'medium') return 'Due';
	return 'Due';
}

/**
 * Builds preventive care gap rows from onboarding immunizations, lab history, and AI recommendations.
 * @returns {{ label: string, status: string }[]}
 */
export function computePreventiveCareGaps({ overview, labResults = [], recommendations = [] }) {
	const gaps = [];
	const seen = new Set();

	const pushGap = (label, status) => {
		const key = label.trim().toLowerCase();
		if (!label || seen.has(key)) return;
		seen.add(key);
		gaps.push({ label: label.trim(), status });
	};

	const fluDate = findLatestFluVaccine(getImmunizationVaccines(overview));
	if (!fluDate) {
		pushGap('Annual Flu Vaccine', 'Due');
	} else {
		const months = monthsSince(fluDate);
		if (months >= 12) {
			pushGap('Annual Flu Vaccine', months >= 18 ? 'Overdue' : 'Due');
		}
	}

	const lipidDate = findLatestLipidTest(labResults);
	if (!lipidDate) {
		pushGap('Lipid Panel', 'Due');
	} else {
		const months = monthsSince(lipidDate);
		if (months >= 12) {
			pushGap('Lipid Panel', months >= 24 ? 'Overdue' : 'Due');
		}
	}

	for (const rec of recommendations) {
		const title = String(rec.title || '').trim();
		const desc = String(rec.description || '').trim();
		if (!title || !PREVENTIVE_REC_PATTERN.test(`${title} ${desc}`)) continue;
		pushGap(title, priorityToStatus(rec.priority));
	}

	return gaps.slice(0, 5);
}
