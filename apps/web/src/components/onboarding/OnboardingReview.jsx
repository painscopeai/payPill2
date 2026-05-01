import React, { useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import { useAuth } from '@/contexts/AuthContext';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function OnboardingReview() {
  const { completeOnboarding } = useOnboarding();
  const { currentUser } = useAuth();
  const [consent, setConsent] = useState({ accuracy: false, processing: false, hipaa: false });

  const isValid = consent.accuracy && consent.processing && consent.hipaa;

  const handleComplete = async () => {
    if (!currentUser?.id) {
      toast.error("Authentication error: Patient ID missing. Please log in again.");
      return false;
    }
    try {
      await completeOnboarding(currentUser.id);
      return true;
    } catch (err) {
      return false;
    }
  };

  return (
    <OnboardingWizard 
      title="Review & Complete" 
      description="Please review your information and provide final consent." 
      isValid={isValid}
      onNext={handleComplete}
    >
      <div className="space-y-6">
        <div className="bg-muted/50 p-6 rounded-xl space-y-3 border border-border">
          <h3 className="text-xl font-semibold text-foreground">Ready to Submit</h3>
          <p className="text-base text-muted-foreground">
            You have completed all sections of the health profile. Your data will be securely encrypted and used to generate personalized AI health recommendations.
          </p>
        </div>

        <div className="space-y-5 pt-6 border-t border-border">
          <h4 className="text-lg font-medium text-foreground">Required Consents</h4>
          
          <div className="flex items-start space-x-3">
            <Checkbox id="accuracy" checked={consent.accuracy} onCheckedChange={c => setConsent(p => ({...p, accuracy: c}))} className="mt-1" />
            <Label htmlFor="accuracy" className="text-base font-normal leading-snug text-foreground cursor-pointer">
              I confirm that the information provided is accurate to the best of my knowledge.
            </Label>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox id="processing" checked={consent.processing} onCheckedChange={c => setConsent(p => ({...p, processing: c}))} className="mt-1" />
            <Label htmlFor="processing" className="text-base font-normal leading-snug text-foreground cursor-pointer">
              I consent to the processing of my health data for personalized recommendations.
            </Label>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox id="hipaa" checked={consent.hipaa} onCheckedChange={c => setConsent(p => ({...p, hipaa: c}))} className="mt-1" />
            <Label htmlFor="hipaa" className="text-base font-normal leading-snug text-foreground cursor-pointer">
              I have read and understand the HIPAA Privacy Notice.
            </Label>
          </div>
        </div>
      </div>
    </OnboardingWizard>
  );
}