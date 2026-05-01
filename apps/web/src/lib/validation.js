export const validatePhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phone) return 'Phone number is required';
  if (!phoneRegex.test(phone.replace(/[\s-()]/g, ''))) return 'Invalid phone number format';
  return null;
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Invalid email format';
  return null;
};

export const validateDate = (date, minAge = 0, maxFuture = false) => {
  if (!date) return 'Date is required';
  const selectedDate = new Date(date);
  const today = new Date();
  
  if (!maxFuture && selectedDate > today) return 'Date cannot be in the future';
  
  if (minAge > 0) {
    let age = today.getFullYear() - selectedDate.getFullYear();
    const m = today.getMonth() - selectedDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < selectedDate.getDate())) {
      age--;
    }
    if (age < minAge) return `Must be at least ${minAge} years old`;
  }
  return null;
};

export const validateNumericRange = (value, min, max, fieldName) => {
  if (value === undefined || value === null || value === '') return `${fieldName} is required`;
  const num = Number(value);
  if (isNaN(num)) return `${fieldName} must be a number`;
  if (num < min || num > max) return `${fieldName} must be between ${min} and ${max}`;
  return null;
};