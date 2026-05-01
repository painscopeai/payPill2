import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function OnboardingStep1() {
  const { formData, updateFormData } = useOnboarding();
  const { currentUser } = useAuth();
  const data = formData.step1 || { email: currentUser?.email || '' };

  const handleChange = (field, value) => {
    updateFormData(1, { [field]: value });
  };

  const isValid = data.first_name && data.last_name && data.phone && data.terms_acceptance;

  return (
    <OnboardingWizard title="Welcome & Profile Setup" description="Let's start with your basic information." isValid={isValid}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>First Name *</Label>
          <Input value={data.first_name || ''} onChange={e => handleChange('first_name', e.target.value)} placeholder="Maya" className="text-foreground" />
        </div>
        <div className="space-y-2">
          <Label>Last Name *</Label>
          <Input value={data.last_name || ''} onChange={e => handleChange('last_name', e.target.value)} placeholder="Chen" className="text-foreground" />
        </div>
        <div className="space-y-2">
          <Label>Preferred Username</Label>
          <Input value={data.preferred_username || ''} onChange={e => handleChange('preferred_username', e.target.value)} placeholder="mayac" className="text-foreground" />
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input type="email" value={data.email || ''} disabled className="bg-muted text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <Label>Phone Number *</Label>
          <Input type="tel" value={data.phone || ''} onChange={e => handleChange('phone', e.target.value)} placeholder="+1 (555) 123-4567" className="text-foreground" />
        </div>
        <div className="space-y-2">
          <Label>Preferred Language</Label>
          <Select value={data.preferred_language || ''} onValueChange={v => handleChange('preferred_language', v)}>
            <SelectTrigger className="text-foreground"><SelectValue placeholder="Select language" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="spanish">Spanish</SelectItem>
              <SelectItem value="french">French</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="md:col-span-2 space-y-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox id="terms" checked={data.terms_acceptance || false} onCheckedChange={c => handleChange('terms_acceptance', c)} />
            <Label htmlFor="terms" className="text-sm font-normal">I accept the Terms of Service and Privacy Policy *</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="privacy" checked={data.privacy_preferences || false} onCheckedChange={c => handleChange('privacy_preferences', c)} />
            <Label htmlFor="privacy" className="text-sm font-normal">I consent to data processing for personalized health insights</Label>
          </div>
        </div>
      </div>
    </OnboardingWizard>
  );
}