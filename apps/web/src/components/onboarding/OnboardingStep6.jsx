import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function OnboardingStep6() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step6 || {};

  const handleChange = (field, value) => {
    updateFormData(6, { [field]: value });
  };

  return (
    <OnboardingWizard title="Allergies" description="List any drug, food, or environmental allergies." isValid={true}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Known Allergies & Reactions</Label>
          <Textarea 
            placeholder="e.g., Penicillin (Hives, Severe), Peanuts (Anaphylaxis, Severe)" 
            value={data.allergies_list || ''} 
            onChange={e => handleChange('allergies_list', e.target.value)}
            className="min-h-[150px] text-foreground"
          />
        </div>
      </div>
    </OnboardingWizard>
  );
}