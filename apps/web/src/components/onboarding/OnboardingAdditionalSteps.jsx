import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// A generic component to handle steps 7-13 to keep the implementation concise
export default function OnboardingAdditionalSteps({ stepNumber, title, description, fieldName, placeholder }) {
  const { formData, updateFormData } = useOnboarding();
  const data = formData[`step${stepNumber}`] || {};

  const handleChange = (value) => {
    updateFormData(stepNumber, { [fieldName]: value });
  };

  return (
    <OnboardingWizard title={title} description={description} isValid={true}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>{title} Details</Label>
          <Textarea 
            placeholder={placeholder} 
            value={data[fieldName] || ''} 
            onChange={e => handleChange(e.target.value)}
            className="min-h-[150px] text-foreground"
          />
        </div>
      </div>
    </OnboardingWizard>
  );
}