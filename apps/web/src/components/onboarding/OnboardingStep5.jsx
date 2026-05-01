import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function OnboardingStep5() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step5 || {};

  const handleChange = (field, value) => {
    updateFormData(5, { [field]: value });
  };

  return (
    <OnboardingWizard title="Current Medications" description="List any medications you are currently taking." isValid={true}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Medications (Include dosage and frequency)</Label>
          <Textarea 
            placeholder="e.g., Lisinopril 10mg daily, Metformin 500mg twice daily" 
            value={data.medications_list || ''} 
            onChange={e => handleChange('medications_list', e.target.value)}
            className="min-h-[150px] text-foreground"
          />
        </div>
      </div>
    </OnboardingWizard>
  );
}