import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import CatalogSelect from './CatalogSelect.jsx';
import { useProfileOptionCatalog } from '@/hooks/useProfileOptionCatalog.js';
import { Building2 } from 'lucide-react';

const KEYS = ['provider_type_primary', 'provider_type_specialist', 'facility_type'];

export default function OnboardingStep12() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step12 || {};
  const { catalog, loading } = useProfileOptionCatalog(KEYS);

  const set = (field, value) => updateFormData(12, { [field]: value });

  return (
    <OnboardingWizard
      title="Healthcare providers"
      description="Continuity of care improves outcomes — list who manages your health."
      isValid={true}
    >
      <div className="space-y-8">
        <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Quick labels</h3>
              <p className="text-sm text-muted-foreground">Optional tags for routing referrals and records.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Primary care style</Label>
              <CatalogSelect
                setKey="provider_type_primary"
                options={catalog.provider_type_primary}
                loading={loading}
                value={data.primary_provider_type || ''}
                onValueChange={(v) => set('primary_provider_type', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2">
              <Label>Common specialist</Label>
              <CatalogSelect
                setKey="provider_type_specialist"
                options={catalog.provider_type_specialist}
                loading={loading}
                value={data.specialist_type || ''}
                onValueChange={(v) => set('specialist_type', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Usual facility type</Label>
              <CatalogSelect
                setKey="facility_type"
                options={catalog.facility_type}
                loading={loading}
                value={data.facility_type || ''}
                onValueChange={(v) => set('facility_type', v)}
                placeholder="Select"
              />
            </div>
          </div>
        </section>

        <div className="space-y-2">
          <Label htmlFor="providers_detail">Your care team</Label>
          <Textarea
            id="providers_detail"
            placeholder="Primary care: Dr. Name, Clinic, phone… Specialists: cardiology, pharmacy…"
            value={data.providers || ''}
            onChange={(e) => set('providers', e.target.value)}
            className="min-h-[180px] text-foreground bg-background"
          />
        </div>
      </div>
    </OnboardingWizard>
  );
}
