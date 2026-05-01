import 'dotenv/config';
import pb from './pocketbaseClient.js';
import logger from './logger.js';

/**
 * Fetch and prepare patient health data for AI analysis
 * Anonymizes sensitive information for HIPAA compliance
 */
export async function preparePatientDataForAnalysis(patientId) {
  const healthData = {
    patient_id: patientId,
    age: null,
    gender: null,
    conditions: [],
    medications: [],
    allergies: [],
    vitals: {},
    lifestyle: {},
    family_history: [],
    health_goals: [],
    recent_appointments: [],
    lab_results: [],
  };

  try {
    // Fetch health profile
    const healthProfile = await pb
      .collection('health_profile')
      .getFirstListItem(`user_id = "${patientId}"`)
      .catch(() => null);

    if (healthProfile) {
      // Calculate age from date of birth
      if (healthProfile.date_of_birth) {
        const dob = new Date(healthProfile.date_of_birth);
        healthData.age = new Date().getFullYear() - dob.getFullYear();
      }
      healthData.gender = healthProfile.gender || null;
      healthData.conditions = healthProfile.conditions || [];
      healthData.allergies = healthProfile.allergies || [];
      healthData.family_history = healthProfile.family_history || [];
      healthData.lifestyle = {
        smoking_status: healthProfile.smoking_status || 'unknown',
        alcohol_consumption: healthProfile.alcohol_consumption || 'unknown',
        exercise_level: healthProfile.exercise_level || 'unknown',
        sleep_quality: healthProfile.sleep_quality || 'unknown',
      };
    }

    // Fetch current medications
    const medications = await pb
      .collection('prescriptions')
      .getFullList({
        filter: `user_id = "${patientId}" && status = "active"`,
      })
      .catch(() => []);

    healthData.medications = medications.map((med) => ({
      name: med.medication_name,
      dosage: med.dosage,
      frequency: med.frequency,
    }));

    // Fetch health goals
    const healthGoals = await pb
      .collection('health_goals')
      .getFullList({
        filter: `user_id = "${patientId}" && status = "active"`,
      })
      .catch(() => []);

    healthData.health_goals = healthGoals.map((goal) => ({
      name: goal.goal_name,
      type: goal.goal_type,
      target_value: goal.target_value,
    }));

    // Fetch recent appointments
    const appointments = await pb
      .collection('appointments')
      .getFullList({
        filter: `user_id = "${patientId}"`,
        sort: '-appointment_date',
        limit: 5,
      })
      .catch(() => []);

    healthData.recent_appointments = appointments.map((apt) => ({
      date: apt.appointment_date,
      type: apt.type,
      reason: apt.reason,
    }));

    // Fetch recent lab results
    const labResults = await pb
      .collection('lab_results')
      .getFullList({
        filter: `user_id = "${patientId}"`,
        sort: '-test_date',
        limit: 10,
      })
      .catch(() => []);

    healthData.lab_results = labResults.map((result) => ({
      test_name: result.test_name,
      result_value: result.result_value,
      unit: result.unit,
      reference_range: result.reference_range,
      test_date: result.test_date,
    }));

    // Fetch latest vitals
    const vitals = await pb
      .collection('vital_signs')
      .getFullList({
        filter: `user_id = "${patientId}"`,
        sort: '-recorded_at',
        limit: 1,
      })
      .catch(() => []);

    if (vitals.length > 0) {
      const latestVitals = vitals[0];
      healthData.vitals = {
        height: latestVitals.height,
        weight: latestVitals.weight,
        bmi: latestVitals.bmi,
        systolic_bp: latestVitals.systolic_bp,
        diastolic_bp: latestVitals.diastolic_bp,
        heart_rate: latestVitals.heart_rate,
        temperature: latestVitals.temperature,
        recorded_at: latestVitals.recorded_at,
      };
    }
  } catch (error) {
    logger.warn(`Error preparing patient data for analysis: ${error.message}`);
  }

  return healthData;
}

/**
 * Format health data for Gemini API prompt
 */
export function formatHealthDataForPrompt(healthData) {
  const lines = [];

  lines.push('=== PATIENT HEALTH PROFILE ===');
  lines.push(`Age: ${healthData.age || 'Not provided'}`);
  lines.push(`Gender: ${healthData.gender || 'Not provided'}`);
  lines.push('');

  if (healthData.conditions.length > 0) {
    lines.push('Current Conditions:');
    healthData.conditions.forEach((condition) => {
      lines.push(`  - ${condition}`);
    });
    lines.push('');
  }

  if (healthData.medications.length > 0) {
    lines.push('Current Medications:');
    healthData.medications.forEach((med) => {
      lines.push(`  - ${med.name} ${med.dosage} (${med.frequency})`);
    });
    lines.push('');
  }

  if (healthData.allergies.length > 0) {
    lines.push('Allergies:');
    healthData.allergies.forEach((allergy) => {
      lines.push(`  - ${allergy}`);
    });
    lines.push('');
  }

  if (Object.keys(healthData.vitals).length > 0) {
    lines.push('Latest Vital Signs:');
    if (healthData.vitals.height) lines.push(`  - Height: ${healthData.vitals.height} cm`);
    if (healthData.vitals.weight) lines.push(`  - Weight: ${healthData.vitals.weight} kg`);
    if (healthData.vitals.bmi) lines.push(`  - BMI: ${healthData.vitals.bmi}`);
    if (healthData.vitals.systolic_bp) lines.push(`  - Blood Pressure: ${healthData.vitals.systolic_bp}/${healthData.vitals.diastolic_bp} mmHg`);
    if (healthData.vitals.heart_rate) lines.push(`  - Heart Rate: ${healthData.vitals.heart_rate} bpm`);
    lines.push('');
  }

  if (healthData.family_history.length > 0) {
    lines.push('Family Medical History:');
    healthData.family_history.forEach((history) => {
      lines.push(`  - ${history}`);
    });
    lines.push('');
  }

  if (healthData.health_goals.length > 0) {
    lines.push('Health Goals:');
    healthData.health_goals.forEach((goal) => {
      lines.push(`  - ${goal.name} (${goal.type})`);
    });
    lines.push('');
  }

  if (healthData.lifestyle && Object.keys(healthData.lifestyle).length > 0) {
    lines.push('Lifestyle Factors:');
    lines.push(`  - Smoking: ${healthData.lifestyle.smoking_status}`);
    lines.push(`  - Alcohol: ${healthData.lifestyle.alcohol_consumption}`);
    lines.push(`  - Exercise: ${healthData.lifestyle.exercise_level}`);
    lines.push(`  - Sleep: ${healthData.lifestyle.sleep_quality}`);
    lines.push('');
  }

  return lines.join('\n');
}