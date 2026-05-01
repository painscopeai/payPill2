import { useState, useCallback } from 'react';

export function useFormValidation(initialState, validationRules) {
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return '';

    if (rules.required && (!value || value.toString().trim() === '')) {
      return rules.requiredMessage || 'This field is required';
    }

    if (rules.email && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Invalid email format';
    }

    if (rules.phone && value) {
      const phoneRegex = /^\D?(\d{3})\D?\D?(\d{3})\D?(\d{4})$/;
      if (!phoneRegex.test(value)) return 'Invalid phone number (10 digits required)';
    }

    if (rules.min && value) {
      if (typeof value === 'number' && value < rules.min) {
        return `Minimum value is ${rules.min}`;
      }
      if (typeof value === 'string' && value.length < rules.min) {
        return `Minimum length is ${rules.min} characters`;
      }
    }

    if (rules.pattern && value) {
      if (!rules.pattern.test(value)) return rules.patternMessage || 'Invalid format';
    }

    return '';
  }, [validationRules]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({ ...prev, [name]: finalValue }));
    
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validate(name, finalValue) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validate(name, finalValue) }));
  };

  const setFieldValue = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validate(name, value) }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(key => {
      const error = validate(key, values[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    
    // Mark all as touched
    const allTouched = Object.keys(validationRules).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    return isValid;
  };

  const resetForm = () => {
    setValues(initialState);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldValue,
    validateForm,
    resetForm,
    isValid: Object.keys(errors).length === 0 && Object.keys(touched).length > 0
  };
}