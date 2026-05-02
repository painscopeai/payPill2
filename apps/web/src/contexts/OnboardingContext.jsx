import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { encryptData, decryptData } from '@/lib/encryption';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const OnboardingContext = createContext(null);

const STORAGE_KEY = 'paypill_onboarding_progress';

export const OnboardingProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patientId, setPatientId] = useState(null);

  // Patient id from Supabase-backed auth profile
  useEffect(() => {
    const id = currentUser?.id;
    if (id) {
      setPatientId(id);
    } else {
      setPatientId(null);
    }
  }, [currentUser]);

  // Load saved progress
  useEffect(() => {
    if (!patientId) return;
    
    const loadProgress = async () => {
      try {
        // Try local storage first for immediate feedback
        const encryptedLocal = localStorage.getItem(`${STORAGE_KEY}_${patientId}`);
        if (encryptedLocal) {
          const localData = decryptData(encryptedLocal);
          if (localData) {
            setFormData(localData.formData || {});
            setCurrentStep(localData.currentStep || 1);
            setCompletedSteps(localData.completedSteps || []);
          }
        }

        // Sync with backend
        console.log('[OnboardingContext] API Request to /onboarding/progress for patient_id:', patientId);
        const response = await apiServerClient.fetch('/onboarding/progress');
        if (response.ok) {
          const data = await response.json();
          if (data.formData) {
            setFormData(prev => ({ ...prev, ...data.formData }));
            setCompletedSteps(data.completedSteps || []);
            // Only update step if backend is further along
            if (data.currentStep > currentStep) {
              setCurrentStep(data.currentStep);
            }
          }
        }
      } catch (err) {
        console.error('[OnboardingContext] Failed to load onboarding progress:', err);
      }
    };

    loadProgress();
  }, [patientId]);

  // Auto-save
  useEffect(() => {
    if (!patientId || Object.keys(formData).length === 0) return;

    const saveInterval = setInterval(() => {
      saveProgress(false);
    }, 30000); // 30 seconds

    return () => clearInterval(saveInterval);
  }, [formData, currentStep, completedSteps, patientId]);

  const saveProgress = useCallback(async (showToast = true, explicitPatientId = null) => {
    const activePatientId = explicitPatientId || patientId || currentUser?.id;
    
    console.log('[OnboardingContext] Preparing to save progress. patient_id:', activePatientId);
    
    if (!activePatientId) {
      console.error('[OnboardingContext] No patient ID available for saving.');
      if (showToast) toast.error('Authentication error: Missing patient ID.');
      return;
    }
    
    const stateToSave = { formData, currentStep, completedSteps };
    
    // Save locally
    const encrypted = encryptData(stateToSave);
    if (encrypted) {
      localStorage.setItem(`${STORAGE_KEY}_${activePatientId}`, encrypted);
    }

    // Save to backend (never throw — callers like autosave must not break completion flow)
    try {
      console.log('[OnboardingContext] API Request to /onboarding/save-step with patient_id:', activePatientId);
      const response = await apiServerClient.fetch('/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: activePatientId,
          step: currentStep,
          data: formData[`step${currentStep}`] || {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error || `Save failed (${response.status})`;
        const fields = errorData.fields;
        if (response.status === 403) {
          console.error('[OnboardingContext] 403 Unauthorized:', msg);
          if (showToast) toast.error('Authentication error: You are not authorized to modify this profile.');
          return false;
        }
        console.warn('[OnboardingContext] save-step rejected:', msg, fields || '');
        if (showToast) {
          toast.error(
            fields?.length
              ? `${msg}: ${Array.isArray(fields) ? fields.join('; ') : JSON.stringify(fields)}`
              : `${msg}. Progress kept locally.`,
          );
        }
        return false;
      }

      if (showToast) toast.success('Progress saved');
      return true;
    } catch (err) {
      console.error('[OnboardingContext] Failed to save to backend:', err);
      if (showToast) toast.error('Failed to sync progress to server. Saved locally.');
      return false;
    }
  }, [formData, currentStep, completedSteps, patientId, currentUser?.id]);

  const updateFormData = (step, data) => {
    setFormData(prev => ({
      ...prev,
      [`step${step}`]: { ...(prev[`step${step}`] || {}), ...data }
    }));
  };

  const nextStep = async () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }
    await saveProgress(false);
    setCurrentStep(prev => Math.min(prev + 1, 14));
  };

  const previousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (step) => {
    if (step <= Math.max(...completedSteps, 1) + 1) {
      setCurrentStep(step);
    }
  };

  const completeOnboarding = async (explicitPatientId = null, options = {}) => {
    const activePatientId = explicitPatientId || patientId || currentUser?.id;

    console.log('[OnboardingContext] Preparing to complete onboarding. patient_id:', activePatientId);

    if (!activePatientId) {
      const msg = 'Authentication error: Missing patient ID.';
      toast.error(msg);
      throw new Error(msg);
    }

    const payload =
      options.allDataOverride && typeof options.allDataOverride === 'object'
        ? options.allDataOverride
        : formData;

    setIsLoading(true);
    setError(null);

    try {
      if (!options.skipPreflightSave) {
        await saveProgress(false, activePatientId);
      }

      console.log('[OnboardingContext] API Request to /onboarding/complete with patient_id:', activePatientId);
      const response = await apiServerClient.fetch('/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: activePatientId,
          formData: payload,
          allData: payload,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          console.error('[OnboardingContext] 403 Unauthorized:', errorData.error || 'patient_id mismatch');
          throw new Error(errorData.error || 'Unauthorized: patient_id does not match authenticated user.');
        }
        throw new Error(errorData.error || 'Failed to complete onboarding');
      }
      
      localStorage.removeItem(`${STORAGE_KEY}_${activePatientId}`);
      return true;
    } catch (err) {
      console.error('[OnboardingContext] Complete onboarding error:', err);
      setError(err.message);
      
      if (err.message?.includes('Unauthorized')) {
        toast.error('Authentication error: You are not authorized to complete this profile.');
      } else {
        toast.error(err.message || 'Failed to complete onboarding');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetOnboarding = () => {
    setFormData({});
    setCurrentStep(1);
    setCompletedSteps([]);
    if (patientId) {
      localStorage.removeItem(`${STORAGE_KEY}_${patientId}`);
    }
  };

  return (
    <OnboardingContext.Provider value={{
      currentStep,
      completedSteps,
      formData,
      isLoading,
      error,
      patientId,
      updateFormData,
      nextStep,
      previousStep,
      goToStep,
      saveProgress,
      completeOnboarding,
      resetOnboarding
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);