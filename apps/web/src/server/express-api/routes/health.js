import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import providers from '../data/providers.json' with { type: 'json' };

const router = new App();

/**
 * Haversine formula to calculate distance between two coordinates
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371; // Earth's radius in km
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Calculate risk score based on age using exponential function
 * Risk increases significantly after age 50
 */
function calculateAgeRisk(age) {
	if (age < 30) return 5;
	if (age < 40) return 10;
	if (age < 50) return 15;
	if (age < 60) return 25;
	if (age < 70) return 35;
	if (age < 80) return 45;
	return 55;
}

/**
 * Calculate risk based on chronic conditions
 * Higher risk conditions: cardiovascular, endocrine, kidney, respiratory, neurological
 */
function calculateConditionRisk(conditions) {
	if (!conditions || !Array.isArray(conditions)) return 0;

	const highRiskConditions = [
		'hypertension',
		'heart disease',
		'coronary artery disease',
		'myocardial infarction',
		'stroke',
		'diabetes',
		'type 1 diabetes',
		'type 2 diabetes',
		'chronic kidney disease',
		'kidney failure',
		'asthma',
		'copd',
		'chronic obstructive pulmonary disease',
		'parkinson\'s',
		'alzheimer\'s',
		'epilepsy',
		'cancer',
	];

	const moderateRiskConditions = [
		'arthritis',
		'osteoporosis',
		'thyroid disease',
		'depression',
		'anxiety',
		'gerd',
		'gastroesophageal reflux',
	];

	let riskScore = 0;
	const conditionLower = conditions.map(c => c.toLowerCase());

	for (const condition of conditionLower) {
		if (highRiskConditions.some(hrc => condition.includes(hrc))) {
			riskScore += 15;
		} else if (moderateRiskConditions.some(mrc => condition.includes(mrc))) {
			riskScore += 8;
		} else {
			riskScore += 5;
		}
	}

	return Math.min(riskScore, 40);
}

/**
 * Calculate risk based on medications
 * More medications = higher risk, certain classes indicate serious conditions
 */
function calculateMedicationRisk(medications) {
	if (!medications || !Array.isArray(medications)) return 0;

	const highRiskMedicationClasses = [
		'anticoagulant',
		'warfarin',
		'insulin',
		'immunosuppressant',
		'chemotherapy',
		'antiarrhythmic',
	];

	let riskScore = 0;

	// Base risk: more medications = higher risk
	if (medications.length > 5) riskScore += 10;
	else if (medications.length > 3) riskScore += 5;
	else if (medications.length > 0) riskScore += 2;

	// Check for high-risk medication classes
	for (const med of medications) {
		const medName = (med.name || '').toLowerCase();
		if (highRiskMedicationClasses.some(hrc => medName.includes(hrc))) {
			riskScore += 8;
		}
	}

	return Math.min(riskScore, 25);
}

/**
 * Calculate risk based on vital signs
 */
function calculateVitalsRisk(vitals) {
	if (!vitals || typeof vitals !== 'object') return 0;

	let riskScore = 0;

	// Blood pressure risk
	if (vitals.systolic_bp) {
		if (vitals.systolic_bp > 160) riskScore += 12;
		else if (vitals.systolic_bp > 140) riskScore += 8;
		else if (vitals.systolic_bp > 130) riskScore += 4;
	}

	if (vitals.diastolic_bp) {
		if (vitals.diastolic_bp > 100) riskScore += 10;
		else if (vitals.diastolic_bp > 90) riskScore += 6;
		else if (vitals.diastolic_bp > 80) riskScore += 2;
	}

	// Resting heart rate risk
	if (vitals.resting_heart_rate) {
		if (vitals.resting_heart_rate > 100) riskScore += 8;
		else if (vitals.resting_heart_rate > 90) riskScore += 4;
	}

	// BMI risk
	if (vitals.bmi) {
		if (vitals.bmi > 35) riskScore += 10;
		else if (vitals.bmi > 30) riskScore += 6;
		else if (vitals.bmi > 25) riskScore += 2;
	}

	return Math.min(riskScore, 30);
}

/**
 * Calculate risk based on lifestyle factors
 */
function calculateLifestyleRisk(lifestyle) {
	if (!lifestyle || typeof lifestyle !== 'object') return 0;

	let riskScore = 0;

	// Smoking status
	if (lifestyle.smoking_status) {
		const status = lifestyle.smoking_status.toLowerCase();
		if (status.includes('current')) riskScore += 15;
		else if (status.includes('former')) riskScore += 5;
	}

	// Exercise level
	if (lifestyle.exercise_level) {
		const level = lifestyle.exercise_level.toLowerCase();
		if (level.includes('none') || level.includes('sedentary')) riskScore += 10;
		else if (level.includes('light')) riskScore += 5;
	}

	// Alcohol consumption
	if (lifestyle.alcohol_consumption) {
		const consumption = lifestyle.alcohol_consumption.toLowerCase();
		if (consumption.includes('heavy')) riskScore += 10;
		else if (consumption.includes('moderate')) riskScore += 3;
	}

	// Sleep quality
	if (lifestyle.sleep_quality) {
		const quality = lifestyle.sleep_quality.toLowerCase();
		if (quality.includes('poor')) riskScore += 8;
		else if (quality.includes('fair')) riskScore += 4;
	}

	return Math.min(riskScore, 35);
}

/**
 * Calculate risk based on family medical history
 */
function calculateFamilyHistoryRisk(familyHistory) {
	if (!familyHistory || !Array.isArray(familyHistory)) return 0;

	const highRiskConditions = [
		'heart disease',
		'stroke',
		'diabetes',
		'cancer',
		'hypertension',
	];

	let riskScore = 0;
	const historyLower = familyHistory.map(h => h.toLowerCase());

	for (const condition of historyLower) {
		if (highRiskConditions.some(hrc => condition.includes(hrc))) {
			riskScore += 8;
		} else {
			riskScore += 4;
		}
	}

	return Math.min(riskScore, 20);
}

/**
 * Determine risk level based on overall score
 */
function getRiskLevel(score) {
	if (score < 25) return 'Low';
	if (score < 50) return 'Moderate';
	if (score < 75) return 'High';
	return 'Critical';
}

/**
 * Generate recommendations based on identified risk factors
 */
function generateRecommendations(riskFactors, age, conditions, lifestyle, vitals) {
	const recommendations = [];

	// Age-based recommendations
	if (age >= 50) {
		recommendations.push('Schedule regular preventive health screenings appropriate for your age');
	}

	// Condition-based recommendations
	if (conditions && Array.isArray(conditions)) {
		const conditionLower = conditions.map(c => c.toLowerCase());
		if (conditionLower.some(c => c.includes('diabetes'))) {
			recommendations.push('Monitor blood glucose regularly and maintain HbA1c below 7%');
			recommendations.push('Consult with an endocrinologist for diabetes management');
		}
		if (conditionLower.some(c => c.includes('hypertension') || c.includes('heart'))) {
			recommendations.push('Monitor blood pressure daily and maintain a low-sodium diet');
			recommendations.push('Consult with a cardiologist for cardiovascular assessment');
		}
		if (conditionLower.some(c => c.includes('kidney'))) {
			recommendations.push('Monitor kidney function regularly and follow dietary restrictions');
			recommendations.push('Consult with a nephrologist for kidney disease management');
		}
		if (conditionLower.some(c => c.includes('asthma') || c.includes('copd'))) {
			recommendations.push('Use prescribed inhalers as directed and avoid respiratory triggers');
			recommendations.push('Consult with a pulmonologist for respiratory management');
		}
	}

	// Lifestyle-based recommendations
	if (lifestyle && typeof lifestyle === 'object') {
		if (lifestyle.smoking_status && lifestyle.smoking_status.toLowerCase().includes('current')) {
			recommendations.push('Smoking cessation is critical - consult with your healthcare provider for cessation programs');
		}
		if (lifestyle.exercise_level && (lifestyle.exercise_level.toLowerCase().includes('none') || lifestyle.exercise_level.toLowerCase().includes('sedentary'))) {
			recommendations.push('Increase physical activity to at least 150 minutes of moderate exercise per week');
		}
		if (lifestyle.alcohol_consumption && lifestyle.alcohol_consumption.toLowerCase().includes('heavy')) {
			recommendations.push('Reduce alcohol consumption to recommended limits (max 1-2 drinks per day)');
		}
		if (lifestyle.sleep_quality && lifestyle.sleep_quality.toLowerCase().includes('poor')) {
			recommendations.push('Improve sleep hygiene - aim for 7-9 hours of quality sleep per night');
		}
	}

	// Vitals-based recommendations
	if (vitals && typeof vitals === 'object') {
		if (vitals.systolic_bp && vitals.systolic_bp > 140) {
			recommendations.push('Blood pressure is elevated - work with your doctor to optimize antihypertensive therapy');
		}
		if (vitals.bmi && vitals.bmi > 30) {
			recommendations.push('Weight management is important - consider consulting with a dietitian for personalized nutrition plan');
		}
		if (vitals.resting_heart_rate && vitals.resting_heart_rate > 100) {
			recommendations.push('Elevated resting heart rate - discuss with your healthcare provider about cardiovascular fitness');
		}
	}

	// Default recommendations if none generated
	if (recommendations.length === 0) {
		recommendations.push('Maintain regular check-ups with your primary care physician');
		recommendations.push('Follow prescribed medication regimen consistently');
	}

	return recommendations;
}

/**
 * POST /health/risk-assessment
 * Calculate comprehensive health risk assessment using local algorithm
 */
router.post('/risk-assessment', async (req, res) => {
	const { conditions, medications, vitals, age, lifestyle, family_history } = req.body;

	if (!age) {
		return res.status(400).json({
			error: 'Missing required field: age',
		});
	}

	// Calculate individual risk components
	const ageRisk = calculateAgeRisk(age);
	const conditionRisk = calculateConditionRisk(conditions);
	const medicationRisk = calculateMedicationRisk(medications);
	const vitalsRisk = calculateVitalsRisk(vitals);
	const lifestyleRisk = calculateLifestyleRisk(lifestyle);
	const familyHistoryRisk = calculateFamilyHistoryRisk(family_history);

	// Calculate overall risk score (weighted average)
	const overallRiskScore = Math.round(
		(ageRisk * 0.15 +
			conditionRisk * 0.25 +
			medicationRisk * 0.15 +
			vitalsRisk * 0.20 +
			lifestyleRisk * 0.15 +
			familyHistoryRisk * 0.10)
	);

	// Identify specific risk factors
	const riskFactors = [];

	if (age >= 60) riskFactors.push('Advanced age');
	if (conditions && Array.isArray(conditions) && conditions.length > 0) {
		riskFactors.push(`${conditions.length} chronic condition(s)`);
	}
	if (medications && Array.isArray(medications) && medications.length > 5) {
		riskFactors.push('Polypharmacy (multiple medications)');
	}
	if (vitals?.systolic_bp > 140 || vitals?.diastolic_bp > 90) {
		riskFactors.push('Elevated blood pressure');
	}
	if (vitals?.bmi > 30) {
		riskFactors.push('Overweight/Obesity');
	}
	if (vitals?.resting_heart_rate > 100) {
		riskFactors.push('Elevated resting heart rate');
	}
	if (lifestyle?.smoking_status?.toLowerCase().includes('current')) {
		riskFactors.push('Current smoker');
	}
	if (lifestyle?.exercise_level?.toLowerCase().includes('none')) {
		riskFactors.push('Sedentary lifestyle');
	}
	if (lifestyle?.alcohol_consumption?.toLowerCase().includes('heavy')) {
		riskFactors.push('Heavy alcohol consumption');
	}
	if (lifestyle?.sleep_quality?.toLowerCase().includes('poor')) {
		riskFactors.push('Poor sleep quality');
	}
	if (family_history && Array.isArray(family_history) && family_history.length > 0) {
		riskFactors.push('Significant family medical history');
	}

	// Generate recommendations
	const recommendations = generateRecommendations(
		riskFactors,
		age,
		conditions,
		lifestyle,
		vitals
	);

	const riskLevel = getRiskLevel(overallRiskScore);

	logger.info(`Risk assessment completed: score=${overallRiskScore}, level=${riskLevel}`);

	res.json({
		overall_risk_score: overallRiskScore,
		risk_level: riskLevel,
		risk_factors: riskFactors,
		recommendations: recommendations,
	});
});

/**
 * GET /health/providers/nearby
 * Find nearby healthcare providers using geolocation
 */
router.get('/providers/nearby', async (req, res) => {
	const { latitude, longitude, provider_type, radius_km } = req.query;

	if (!latitude || !longitude) {
		return res.status(400).json({
			error: 'Missing required parameters: latitude, longitude',
		});
	}

	const lat = parseFloat(latitude);
	const lon = parseFloat(longitude);
	const radius = parseFloat(radius_km) || 10;

	if (isNaN(lat) || isNaN(lon)) {
		return res.status(400).json({
			error: 'Invalid latitude or longitude values',
		});
	}

	let filteredProviders = providers;

	if (provider_type) {
		filteredProviders = filteredProviders.filter(
			p => p.type.toLowerCase() === provider_type.toLowerCase()
		);
	}

	const nearbyProviders = filteredProviders
		.map(provider => ({
			...provider,
			distance_km: calculateDistance(
				lat,
				lon,
				provider.latitude,
				provider.longitude
			),
		}))
		.filter(p => p.distance_km <= radius)
		.sort((a, b) => a.distance_km - b.distance_km);

	logger.info(`Found ${nearbyProviders.length} nearby providers`);
	res.json(nearbyProviders);
});

export default router;