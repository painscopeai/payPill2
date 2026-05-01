export const validateEmail = (email) => {
  if (!email) return { isValid: false, error: 'Email is required' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { isValid: false, error: 'Invalid email format' };
  return { isValid: true, error: '' };
};

export const validatePhone = (phone) => {
  if (!phone) return { isValid: false, error: 'Phone number is required' };
  const phoneRegex = /^\+?[\d\s-]{10,15}$/;
  if (!phoneRegex.test(phone)) return { isValid: false, error: 'Invalid phone format' };
  return { isValid: true, error: '' };
};

export const validateDateOfBirth = (dob) => {
  if (!dob) return { isValid: false, error: 'Date of birth is required' };
  const date = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
    age--;
  }
  if (age < 18) return { isValid: false, error: 'Must be at least 18 years old' };
  if (age > 120) return { isValid: false, error: 'Invalid date of birth' };
  return { isValid: true, error: '' };
};

export const validateRequiredField = (value, fieldName = 'This field') => {
  if (value === undefined || value === null || value.toString().trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true, error: '' };
};

export const validateOnboardingStep = (stepNumber, formData) => {
  const errors = {};
  let isValid = true;

  if (stepNumber === 1) {
    const { personal } = formData;
    
    const fNameCheck = validateRequiredField(personal.firstName, 'First name');
    if (!fNameCheck.isValid) { errors.firstName = fNameCheck.error; isValid = false; }
    
    const lNameCheck = validateRequiredField(personal.lastName, 'Last name');
    if (!lNameCheck.isValid) { errors.lastName = lNameCheck.error; isValid = false; }
    
    const dobCheck = validateDateOfBirth(personal.dob);
    if (!dobCheck.isValid) { errors.dob = dobCheck.error; isValid = false; }
    
    const phoneCheck = validatePhone(personal.phone);
    if (!phoneCheck.isValid) { errors.phone = phoneCheck.error; isValid = false; }
    
    const emailCheck = validateEmail(personal.email);
    if (!emailCheck.isValid) { errors.email = emailCheck.error; isValid = false; }
    
    if (!validateRequiredField(personal.address).isValid) { errors.address = 'Address is required'; isValid = false; }
    if (!validateRequiredField(personal.city).isValid) { errors.city = 'City is required'; isValid = false; }
    if (!validateRequiredField(personal.state).isValid) { errors.state = 'State is required'; isValid = false; }
    if (!validateRequiredField(personal.zip).isValid) { errors.zip = 'ZIP code is required'; isValid = false; }
    if (!validateRequiredField(personal.country).isValid) { errors.country = 'Country is required'; isValid = false; }
    
    if (!validateRequiredField(personal.emergencyName).isValid) { errors.emergencyName = 'Emergency contact name required'; isValid = false; }
    const emergPhoneCheck = validatePhone(personal.emergencyPhone);
    if (!emergPhoneCheck.isValid) { errors.emergencyPhone = emergPhoneCheck.error; isValid = false; }
  }

  if (stepNumber === 5) {
    if (!formData.insurance.dataSharing) {
      errors.dataSharing = 'You must consent to data sharing to proceed';
      isValid = false;
    }
  }

  return { isValid, errors };
};