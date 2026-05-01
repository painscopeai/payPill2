import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

export default function OnboardingStep3() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step3 || {};

  const handleChange = (field, value) => {
    const updates = { [field]: value };
    if (field === 'height' || field === 'weight') {
      const h = field === 'height' ? value : data.height;
      const w = field === 'weight' ? value : data.weight;
      if (h && w) {
        // Assuming height in cm, weight in kg
        const heightInMeters = h / 100;
        updates.bmi = (w / (heightInMeters * heightInMeters)).toFixed(1);
      }
    }
    updateFormData(3, updates);
  };

  const isValid = true; // Optional fields

  return (
    <OnboardingWizard title="Body Measurements & Vitals" description="Enter your latest measurements." isValid={isValid}>
      <div className="space-y-6">
        <Collapsible defaultOpen className="border rounded-lg p-4">
          <CollapsibleTrigger className="flex justify-between items-center w-full font-semibold text-lg">
            Body Measurements <ChevronDown className="h-5 w-5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Height (cm)</Label>
              <Input type="number" value={data.height || ''} onChange={e => handleChange('height', e.target.value)} className="text-foreground" />
            </div>
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input type="number" value={data.weight || ''} onChange={e => handleChange('weight', e.target.value)} className="text-foreground" />
            </div>
            <div className="space-y-2">
              <Label>BMI</Label>
              <Input value={data.bmi || ''} disabled className="bg-muted text-muted-foreground" />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible defaultOpen className="border rounded-lg p-4">
          <CollapsibleTrigger className="flex justify-between items-center w-full font-semibold text-lg">
            Vital Baseline <ChevronDown className="h-5 w-5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Resting Heart Rate (bpm)</Label>
              <Input type="number" value={data.resting_heart_rate || ''} onChange={e => handleChange('resting_heart_rate', e.target.value)} className="text-foreground" />
            </div>
            <div className="space-y-2">
              <Label>Blood Pressure (Systolic/Diastolic)</Label>
              <div className="flex gap-2">
                <Input type="number" placeholder="120" value={data.blood_pressure_systolic || ''} onChange={e => handleChange('blood_pressure_systolic', e.target.value)} className="text-foreground" />
                <span className="text-2xl text-muted-foreground">/</span>
                <Input type="number" placeholder="80" value={data.blood_pressure_diastolic || ''} onChange={e => handleChange('blood_pressure_diastolic', e.target.value)} className="text-foreground" />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </OnboardingWizard>
  );
}