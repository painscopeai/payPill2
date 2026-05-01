import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function OnboardingStep4() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step4 || {};

  const handleChange = (field, value) => {
    updateFormData(4, { [field]: value });
  };

  return (
    <OnboardingWizard title="Pre-existing Conditions" description="List any chronic or past medical conditions." isValid={true}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Medical Conditions (Comma separated)</Label>
          <Textarea 
            placeholder="e.g., Hypertension, Type 2 Diabetes, Asthma" 
            value={data.conditions_list || ''} 
            onChange={e => handleChange('conditions_list', e.target.value)}
            className="min-h-[100px] text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label>Additional Notes</Label>
          <Textarea 
            placeholder="Any details about treatments or managing doctors..." 
            value={data.additional_notes || ''} 
            onChange={e => handleChange('additional_notes', e.target.value)}
            className="min-h-[100px] text-foreground"
          />
        </div>
      </div>
    </OnboardingWizard>
  );
}