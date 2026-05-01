import React from 'react';
import { Helmet } from 'react-helmet';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingStep1 from '@/components/onboarding/OnboardingStep1.jsx';
import OnboardingStep2 from '@/components/onboarding/OnboardingStep2.jsx';
import OnboardingStep3 from '@/components/onboarding/OnboardingStep3.jsx';
import OnboardingStep4 from '@/components/onboarding/OnboardingStep4.jsx';
import OnboardingStep5 from '@/components/onboarding/OnboardingStep5.jsx';
import OnboardingStep6 from '@/components/onboarding/OnboardingStep6.jsx';
import OnboardingAdditionalSteps from '@/components/onboarding/OnboardingAdditionalSteps.jsx';
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
      case 7: return <OnboardingAdditionalSteps stepNumber={7} title="Family Medical History" description="List significant family medical history." fieldName="family_history" placeholder="e.g., Mother: Breast Cancer (age 50)" />;
      case 8: return <OnboardingAdditionalSteps stepNumber={8} title="Surgical History" description="List past surgeries and procedures." fieldName="surgeries" placeholder="e.g., Appendectomy (2015)" />;
      case 9: return <OnboardingAdditionalSteps stepNumber={9} title="Immunizations" description="List recent or major immunizations." fieldName="immunizations" placeholder="e.g., COVID-19 (2023), Flu (2023)" />;
      case 10: return <OnboardingAdditionalSteps stepNumber={10} title="Lab History" description="Recent significant lab results." fieldName="labs" placeholder="e.g., High Cholesterol (2022)" />;
      case 11: return <OnboardingAdditionalSteps stepNumber={11} title="Lifestyle & Habits" description="Diet, exercise, smoking, and alcohol habits." fieldName="lifestyle" placeholder="e.g., Non-smoker, exercises 3x/week" />;
      case 12: return <OnboardingAdditionalSteps stepNumber={12} title="Healthcare Providers" description="Your primary care and specialists." fieldName="providers" placeholder="e.g., Dr. Smith (Primary Care)" />;
      case 13: return <OnboardingAdditionalSteps stepNumber={13} title="Health Insurance" description="Your current insurance coverage." fieldName="insurance" placeholder="e.g., BlueCross BlueShield, Member ID: 12345" />;
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