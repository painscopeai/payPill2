import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Save, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { buildCompletePayload, canCompleteOnboarding } from '@/lib/onboardingCompletion.js';

export default function OnboardingWizard({
  children,
  title,
  description,
  isValid,
  onNext,
  stepNumber,
  primaryLabel,
  advanceOnSuccess = true,
  showSecondaryAction = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
}) {
  const { currentStep, nextStep, previousStep, saveProgress, isLoading, formData, completeOnboarding } = useOnboarding();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const totalSteps = 14;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = async () => {
    if (onNext) {
      const success = await onNext();
      if (!success) return;
      if (!advanceOnSuccess || currentStep >= totalSteps) return;
    }
    await nextStep();
  };

  const handleSkipAndComplete = async () => {
    if (!currentUser?.id) {
      toast.error('Authentication error: Patient ID missing. Please log in again.');
      return;
    }
    if (!canCompleteOnboarding(formData)) {
      toast.error('Complete required fields on steps 1 and 2 first.');
      return;
    }
    try {
      await completeOnboarding(currentUser.id, {
        allDataOverride: buildCompletePayload(formData),
      });
      toast.success('Your health profile is saved.');
      navigate('/patient/dashboard', { replace: true });
    } catch {
      /* completeOnboarding surfaces errors */
    }
  };

  const showOptionalSkip =
    currentStep >= 3 && currentStep < totalSteps && canCompleteOnboarding(formData);

  const profileAlreadyComplete = currentUser?.onboarding_completed === true;

  const handleSaveAndExit = async () => {
    if (!profileAlreadyComplete) return;
    if (!currentUser?.id) {
      toast.error("Authentication error: Patient ID missing. Please log in again.");
      return;
    }
    try {
      await saveProgress(true, currentUser.id);
      navigate('/patient/dashboard', { replace: true });
    } catch (err) {
      console.error("[OnboardingWizard] Save and exit failed:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end">
          <div>
            <p className="text-sm font-medium text-primary mb-1 tracking-wide uppercase">Step {currentStep} of {totalSteps}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-balance">{title}</h1>
            {description && <p className="text-muted-foreground mt-2 text-lg max-w-prose">{description}</p>}
          </div>
          {profileAlreadyComplete ? (
            <Button variant="outline" onClick={handleSaveAndExit} className="shrink-0 w-full sm:w-auto" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" /> Save & exit
            </Button>
          ) : null}
        </div>
        <Progress value={progress} className="h-2 bg-muted" />
      </div>

      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-card border rounded-2xl p-6 md:p-8 shadow-lg mb-8"
      >
        {children}
      </motion.div>

      {showOptionalSkip ? (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Steps {currentStep}–{totalSteps - 1} are optional. You can finish now or keep adding details.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <Button
          variant="outline"
          onClick={previousStep}
          disabled={currentStep === 1 || isLoading}
          className="min-w-[100px]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          {showOptionalSkip ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleSkipAndComplete}
              disabled={isLoading}
              className="min-w-[160px]"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Skip & complete'}
            </Button>
          ) : null}
          {showSecondaryAction ? (
            <Button
              type="button"
              variant="outline"
              onClick={onSecondary}
              disabled={secondaryDisabled || isLoading}
              className="min-w-[160px]"
            >
              {secondaryLabel}
            </Button>
          ) : null}
          <Button
            onClick={handleNext}
            disabled={!isValid || isLoading}
            className="min-w-[120px] shadow-md"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : primaryLabel ? (
              primaryLabel
            ) : currentStep === totalSteps ? (
              <>Complete <CheckCircle2 className="h-4 w-4 ml-2" /></>
            ) : (
              <>Next <ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}