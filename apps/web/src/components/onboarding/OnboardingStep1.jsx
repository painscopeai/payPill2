import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import { useAuth } from '@/contexts/AuthContext';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import CatalogSelect from './CatalogSelect.jsx';
import { useProfileOptionCatalog } from '@/hooks/useProfileOptionCatalog.js';
import { User, Mail, MessageSquare, Shield } from 'lucide-react';

const CATALOG_KEYS = [
  'preferred_language',
  'communication_preference',
  'account_two_factor',
];

export default function OnboardingStep1() {
  const { formData, updateFormData } = useOnboarding();
  const { currentUser } = useAuth();
  const defaults = {
    email: currentUser?.email || '',
    first_name: currentUser?.first_name || '',
    last_name: currentUser?.last_name || '',
    phone: currentUser?.phone || '',
  };
  const saved = formData.step1 && typeof formData.step1 === 'object' ? formData.step1 : {};
  const data = { ...defaults, ...saved };
  const { catalog, loading: catalogLoading } = useProfileOptionCatalog(CATALOG_KEYS);

  const handleChange = (field, value) => {
    updateFormData(1, { [field]: value });
  };

  const isValid = data.first_name && data.last_name && data.phone && data.terms_acceptance === true;

  const introSections = [
    { id: 'identity', title: 'Your name', icon: User, description: 'As it should appear on your care record.' },
    { id: 'contact', title: 'Contact', icon: Mail, description: 'How we reach you about appointments and care.' },
  ];

  return (
    <OnboardingWizard title="Welcome & profile setup" description="Let's start with your basic information." isValid={!!isValid}>
      <div className="space-y-8">
        {introSections.map(({ id, title, icon: Icon, description }) => (
          <section key={id} className="rounded-2xl border border-border/80 bg-muted/20 p-5 md:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            {id === 'identity' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First name *</Label>
                  <Input
                    id="first_name"
                    value={data.first_name || ''}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    placeholder="First name"
                    className="text-foreground bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last name *</Label>
                  <Input
                    id="last_name"
                    value={data.last_name || ''}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    placeholder="Last name"
                    className="text-foreground bg-background"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="preferred_username">Preferred username</Label>
                  <Input
                    id="preferred_username"
                    value={data.preferred_username || ''}
                    onChange={(e) => handleChange('preferred_username', e.target.value)}
                    placeholder="Optional display name"
                    className="text-foreground bg-background"
                  />
                </div>
              </div>
            )}
            {id === 'contact' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={data.email || ''} disabled className="bg-muted/80 text-muted-foreground" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone">Phone number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={data.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="text-foreground bg-background"
                  />
                </div>
              </div>
            )}
          </section>
        ))}

        <section className="rounded-2xl border border-border/80 bg-muted/20 p-5 md:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Preferences</h3>
              <p className="text-sm text-muted-foreground">Language and how you prefer we communicate.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Preferred language</Label>
              <CatalogSelect
                setKey="preferred_language"
                options={catalog.preferred_language}
                loading={catalogLoading}
                value={data.preferred_language || ''}
                onValueChange={(v) => handleChange('preferred_language', v)}
                placeholder="Select language"
              />
            </div>
            <div className="space-y-2">
              <Label>Communication preference</Label>
              <CatalogSelect
                setKey="communication_preference"
                options={catalog.communication_preference}
                loading={catalogLoading}
                value={data.communication_preference || ''}
                onValueChange={(v) => handleChange('communication_preference', v)}
                placeholder="Select preference"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-muted/20 p-5 md:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Two-factor authentication</h3>
              <p className="text-sm text-muted-foreground">Tell us if you use 2FA on your account (optional).</p>
            </div>
          </div>
          <div className="max-w-md space-y-2">
            <Label>2FA status</Label>
            <CatalogSelect
              setKey="account_two_factor"
              options={catalog.account_two_factor}
              loading={catalogLoading}
              value={data.account_two_factor || ''}
              onValueChange={(v) => handleChange('account_two_factor', v)}
              placeholder="Select status"
            />
          </div>
        </section>

        <Separator />

        <div className="rounded-xl border border-dashed border-border bg-background/50 p-5 space-y-4">
          <p className="text-sm font-medium text-foreground">Legal</p>
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={data.terms_acceptance === true}
              onCheckedChange={(c) => handleChange('terms_acceptance', c === true)}
              className="mt-0.5"
            />
            <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
              I accept the Terms of Service and Privacy Policy *
            </Label>
          </div>
          <div className="flex items-start space-x-3">
            <Checkbox
              id="privacy"
              checked={data.privacy_preferences === true}
              onCheckedChange={(c) => handleChange('privacy_preferences', c === true)}
              className="mt-0.5"
            />
            <Label htmlFor="privacy" className="text-sm font-normal leading-relaxed cursor-pointer">
              I consent to data processing for personalized health insights (optional)
            </Label>
          </div>
        </div>
      </div>
    </OnboardingWizard>
  );
}
