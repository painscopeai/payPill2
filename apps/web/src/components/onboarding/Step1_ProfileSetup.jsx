import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { UploadCloud } from 'lucide-react';
import TermsModal from '../TermsModal';
import PrivacyModal from '../PrivacyModal';

export default function Step1_ProfileSetup({ data, updateData, errors }) {
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const handleCommsToggle = (method) => {
    const current = data.communication_preference || [];
    const updated = current.includes(method)
      ? current.filter(m => m !== method)
      : [...current, method];
    updateData({ communication_preference: updated });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Profile Setup</h2>
        <p className="text-muted-foreground mt-1">Let's start with your basic information and security preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 flex flex-col items-center space-y-4">
          <div className="w-40 h-40 rounded-full border-2 border-dashed border-primary/50 bg-muted/30 flex flex-col items-center justify-center text-muted-foreground overflow-hidden relative group cursor-pointer hover:bg-muted/50 transition-colors">
            <UploadCloud className="h-8 w-8 mb-2" />
            <span className="text-xs font-medium">Upload Photo</span>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
          </div>
          <p className="text-xs text-muted-foreground text-center">JPG, PNG, GIF up to 5MB</p>
        </div>

        <div className="md:col-span-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" value={data.first_name || ''} onChange={e => updateData({ first_name: e.target.value })} className={errors.first_name ? 'border-destructive' : ''} />
              {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" value={data.last_name || ''} onChange={e => updateData({ last_name: e.target.value })} className={errors.last_name ? 'border-destructive' : ''} />
              {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_name">Preferred Name</Label>
              <Input id="preferred_name" value={data.preferred_name || ''} onChange={e => updateData({ preferred_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" type="email" value={data.email || ''} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={data.phone || ''} onChange={e => updateData({ phone: e.target.value })} className={errors.phone ? 'border-destructive' : ''} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Preferred Language *</Label>
              <Select value={data.preferred_language || ''} onValueChange={v => updateData({ preferred_language: v })}>
                <SelectTrigger className={errors.preferred_language ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="Mandarin">Mandarin</SelectItem>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.preferred_language && <p className="text-xs text-destructive">{errors.preferred_language}</p>}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Label>Communication Preferences *</Label>
            <div className="flex flex-wrap gap-4">
              {['Email', 'SMS', 'Push Notification'].map(method => (
                <div key={method} className="flex items-center space-x-2">
                  <Checkbox id={`comm_${method}`} checked={(data.communication_preference || []).includes(method)} onCheckedChange={() => handleCommsToggle(method)} />
                  <Label htmlFor={`comm_${method}`} className="font-normal cursor-pointer">{method}</Label>
                </div>
              ))}
            </div>
            {errors.communication_preference && <p className="text-xs text-destructive">{errors.communication_preference}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-5 pt-6 border-t">
        <h3 className="text-lg font-semibold">Account Security & Privacy</h3>
        
        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div className="space-y-0.5">
            <Label className="text-base">Two-Factor Authentication (2FA)</Label>
            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
          </div>
          <Switch checked={data.two_factor_enabled || false} onCheckedChange={v => updateData({ two_factor_enabled: v })} />
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox id="terms" checked={data.terms_accepted || false} onCheckedChange={v => updateData({ terms_accepted: v })} className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="terms" className="font-normal leading-snug">
                I accept the <button type="button" onClick={() => setTermsOpen(true)} className="text-primary hover:underline font-medium">Terms & Conditions</button> *
              </Label>
              {errors.terms_accepted && <p className="text-xs text-destructive">{errors.terms_accepted}</p>}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox id="privacy" checked={data.privacy_accepted || false} onCheckedChange={v => updateData({ privacy_accepted: v })} className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="privacy" className="font-normal leading-snug">
                I acknowledge the <button type="button" onClick={() => setPrivacyOpen(true)} className="text-primary hover:underline font-medium">Privacy Policy</button> *
              </Label>
              {errors.privacy_accepted && <p className="text-xs text-destructive">{errors.privacy_accepted}</p>}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox id="data_sharing" checked={data.data_sharing_consent || false} onCheckedChange={v => updateData({ data_sharing_consent: v })} className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="data_sharing" className="font-normal leading-snug">
                I consent to data sharing with my healthcare providers for continuity of care. *
              </Label>
              {errors.data_sharing_consent && <p className="text-xs text-destructive">{errors.data_sharing_consent}</p>}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox id="research" checked={data.research_participation || false} onCheckedChange={v => updateData({ research_participation: v })} className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="research" className="font-normal leading-snug text-muted-foreground">
                I agree to share fully anonymized health data to participate in medical research and improve AI models. (Optional)
              </Label>
            </div>
          </div>
        </div>
      </div>

      <TermsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} onAccept={() => updateData({ terms_accepted: true })} />
      <PrivacyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} onAccept={() => updateData({ privacy_accepted: true })} />
    </div>
  );
}