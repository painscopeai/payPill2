import React from 'react';
import { Helmet } from 'react-helmet';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingStep1 from '@/components/onboarding/OnboardingStep1.jsx';
import OnboardingStep2 from '@/components/onboarding/OnboardingStep2.jsx';
import OnboardingStep3 from '@/components/onboarding/OnboardingStep3.jsx';
import OnboardingStep4 from '@/components/onboarding/OnboardingStep4.jsx';
import OnboardingStep5 from '@/components/onboarding/OnboardingStep5.jsx';
import OnboardingStep6 from '@/components/onboarding/OnboardingStep6.jsx';
import OnboardingStep7 from '@/components/onboarding/OnboardingStep7.jsx';
import OnboardingAdditionalSteps from '@/components/onboarding/OnboardingAdditionalSteps.jsx';
import OnboardingStep9 from '@/components/onboarding/OnboardingStep9.jsx';
import OnboardingStep10 from '@/components/onboarding/OnboardingStep10.jsx';
import OnboardingStep11 from '@/components/onboarding/OnboardingStep11.jsx';
import OnboardingStep12 from '@/components/onboarding/OnboardingStep12.jsx';
import OnboardingStep13 from '@/components/onboarding/OnboardingStep13.jsx';
import OnboardingReview from '@/components/onboarding/OnboardingReview.jsx';

export default function PatientOnboardingPage() {
  const { currentStep } = useOnboarding();

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <OnboardingStep1 />;
      case 2: return <OnboardingStep2 />;
      case 3: return <OnboardingStep3 />;
      case 4: return <OnboardingStep4 />;
      case 5: return <OnboardingStep5 />;
      case 6: return <OnboardingStep6 />;
      case 7: return <OnboardingStep7 />;
      case 8: return <OnboardingAdditionalSteps stepNumber={8} title="Surgical history" description="Surgeries, implants, and procedures you've had." fieldName="surgeries" placeholder="Procedure, year, facility, complications…" />;
      case 9: return <OnboardingStep9 />;
      case 10: return <OnboardingStep10 />;
      case 11: return <OnboardingStep11 />;
      case 12: return <OnboardingStep12 />;
      case 13: return <OnboardingStep13 />;
      case 14: return <OnboardingReview />;
      default: return <OnboardingStep1 />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>{`Step ${currentStep} - Health Profile Onboarding`}</title></Helmet>
      {renderStep()}
    </div>
  );
}