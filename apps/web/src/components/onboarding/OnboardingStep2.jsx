import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OnboardingStep2() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step2 || {};

  const calculateAge = (dob) => {
    if (!dob) return '';
    const diff = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  const handleChange = (field, value) => {
    const updates = { [field]: value };
    if (field === 'date_of_birth') {
      updates.age = calculateAge(value);
    }
    updateFormData(2, updates);
  };

  const isValid = data.date_of_birth && data.sex_assigned_at_birth;

  return (
    <OnboardingWizard title="Demographics" description="Help us understand your background for better care." isValid={isValid}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Date of Birth *</Label>
          <Input type="date" value={data.date_of_birth || ''} onChange={e => handleChange('date_of_birth', e.target.value)} className="text-foreground" />
        </div>
        <div className="space-y-2">
          <Label>Age</Label>
          <Input value={data.age || ''} disabled className="bg-muted text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <Label>Sex Assigned at Birth *</Label>
          <Select value={data.sex_assigned_at_birth || ''} onValueChange={v => handleChange('sex_assigned_at_birth', v)}>
            <SelectTrigger className="text-foreground"><SelectValue placeholder="Select sex" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Intersex">Intersex</SelectItem>
              <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Gender Identity</Label>
          <Select value={data.gender_identity || ''} onValueChange={v => handleChange('gender_identity', v)}>
            <SelectTrigger className="text-foreground"><SelectValue placeholder="Select gender identity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Non-binary">Non-binary</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Blood Group</Label>
          <Select value={data.blood_group || ''} onValueChange={v => handleChange('blood_group', v)}>
            <SelectTrigger className="text-foreground"><SelectValue placeholder="Select blood group" /></SelectTrigger>
            <SelectContent>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </OnboardingWizard>
  );
}