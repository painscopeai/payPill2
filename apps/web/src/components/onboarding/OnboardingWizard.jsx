import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Save, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function OnboardingWizard({ children, title, description, isValid, onNext, stepNumber }) {
  const { currentStep, nextStep, previousStep, saveProgress, isLoading } = useOnboarding();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const totalSteps = 14;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = async () => {
    if (onNext) {
      const success = await onNext();
      if (!success) return;
      // Final step: custom handler finished (e.g. navigate or success UI) — do not run nextStep / duplicate save
      if (currentStep >= totalSteps) return;
    }
    await nextStep();
  };

  const handleSaveAndExit = async () => {
    if (!currentUser?.id) {
      toast.error("Authentication error: Patient ID missing. Please log in again.");
      return;
    }
    try {
      await saveProgress(true, currentUser.id);
      navigate('/patient/dashboard');
    } catch (err) {
      console.error("[OnboardingWizard] Save and exit failed:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm font-medium text-primary mb-1 tracking-wide uppercase">Step {currentStep} of {totalSteps}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-balance">{title}</h1>
            {description && <p className="text-muted-foreground mt-2 text-lg max-w-prose">{description}</p>}
          </div>
          <Button variant="ghost" onClick={handleSaveAndExit} className="hidden sm:flex" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" /> Save & Exit
          </Button>
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

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={previousStep}
          disabled={currentStep === 1 || isLoading}
          className="min-w-[100px]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!isValid || isLoading}
          className="min-w-[120px] shadow-md"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : currentStep === totalSteps ? (
            <>Complete <CheckCircle2 className="h-4 w-4 ml-2" /></>
          ) : (
            <>Next <ArrowRight className="h-4 w-4 ml-2" /></>
          )}
        </Button>
      </div>
    </div>
  );
}