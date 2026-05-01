/**
 * Validation rules for onboarding steps
 * Each step has required fields and optional fields
 */

const stepValidation = {
  1: {
    name: 'Personal Information',
    required: ['first_name', 'last_name', 'date_of_birth', 'gender'],
    optional: ['middle_name', 'phone_number'],
  },
  2: {
    name: 'Contact Information',
    required: ['email', 'address', 'city', 'state', 'zip_code'],
    optional: ['apartment_number', 'country'],
  },
  3: {
    name: 'Insurance Information',
    required: ['insurance_provider', 'policy_number'],
    optional: ['group_number', 'member_id', 'copay_amount'],
  },
  4: {
    name: 'Medical Conditions',
    required: [],
    optional: ['conditions'],
  },
  5: {
    name: 'Current Medications',
    required: [],
    optional: ['medications'],
  },
  6: {
    name: 'Allergies',
    required: [],
    optional: ['allergies', 'allergy_severity'],
  },
  7: {
    name: 'Family Medical History',
    required: [],
    optional: ['family_history'],
  },
  8: {
    name: 'Lifestyle Information',
    required: [],
    optional: ['smoking_status', 'alcohol_consumption', 'exercise_level', 'sleep_quality'],
  },
  9: {
    name: 'Vital Signs',
    required: [],
    optional: ['height', 'weight', 'blood_pressure', 'heart_rate', 'temperature'],
  },
  10: {
    name: 'Health Goals',
    required: [],
    optional: ['health_goals'],
  },
  11: {
    name: 'Pharmacy Preferences',
    required: [],
    optional: ['preferred_pharmacy', 'pharmacy_location'],
  },
  12: {
    name: 'Healthcare Providers',
    required: [],
    optional: ['primary_care_provider', 'specialists'],
  },
  13: {
    name: 'Review & Confirm',
    required: ['confirmed'],
    optional: ['additional_notes'],
  },
};

/**
 * Validate step data
 * @param {number} step - Step number (1-13)
 * @param {object} data - Data to validate
 * @returns {object} - { valid: boolean, errors: array }
 */
export function validateStep(step, data) {
  const errors = [];

  // Validate step number
  if (!stepValidation[step]) {
    return {
      valid: false,
      errors: [`Invalid step number: ${step}. Must be between 1 and 13.`],
    };
  }

  const validation = stepValidation[step];

  // Check required fields
  for (const field of validation.required) {
    if (!data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate specific field formats
  if (step === 1) {
    if (data.date_of_birth) {
      const dob = new Date(data.date_of_birth);
      if (isNaN(dob.getTime())) {
        errors.push('Invalid date_of_birth format. Use YYYY-MM-DD.');
      }
      const age = new Date().getFullYear() - dob.getFullYear();
      if (age < 0 || age > 150) {
        errors.push('Invalid age. Must be between 0 and 150.');
      }
    }
  }

  if (step === 2) {
    if (data.email && !isValidEmail(data.email)) {
      errors.push('Invalid email format.');
    }
    if (data.zip_code && !isValidZipCode(data.zip_code)) {
      errors.push('Invalid zip code format.');
    }
  }

  if (step === 3) {
    if (data.copay_amount && isNaN(parseFloat(data.copay_amount))) {
      errors.push('copay_amount must be a valid number.');
    }
  }

  if (step === 9) {
    if (data.height && isNaN(parseFloat(data.height))) {
      errors.push('height must be a valid number.');
    }
    if (data.weight && isNaN(parseFloat(data.weight))) {
      errors.push('weight must be a valid number.');
    }
    if (data.heart_rate && isNaN(parseInt(data.heart_rate))) {
      errors.push('heart_rate must be a valid number.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate US zip code format
 */
function isValidZipCode(zipCode) {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
}

/**
 * Validate all onboarding steps
 * @param {object} allData - Complete onboarding data
 * @returns {object} - { valid: boolean, errors: object }
 */
export function validateAllSteps(allData) {
  const errors = {};

  for (let step = 1; step <= 13; step++) {
    const stepData = allData[`step_${step}`] || {};
    const validation = validateStep(step, stepData);

    if (!validation.valid) {
      errors[`step_${step}`] = validation.errors;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export { stepValidation };