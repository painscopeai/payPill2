import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import CatalogSelect from './CatalogSelect.jsx';
import { useProfileOptionCatalog } from '@/hooks/useProfileOptionCatalog.js';
import { Shield } from 'lucide-react';

const KEYS = ['insurance_coverage_type', 'insurance_carrier', 'coverage_area'];

export default function OnboardingStep13() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step13 || {};
  const { catalog, loading } = useProfileOptionCatalog(KEYS);

  const selectedAreas = Array.isArray(data.coverage_areas_slugs) ? data.coverage_areas_slugs : [];

  const toggleArea = (slug, checked) => {
    const arr = [...selectedAreas];
    if (checked) {
      if (!arr.includes(slug)) arr.push(slug);
    } else {
      const i = arr.indexOf(slug);
      if (i >= 0) arr.splice(i, 1);
    }
    updateFormData(13, { coverage_areas_slugs: arr });
  };

  const set = (field, value) => updateFormData(13, { [field]: value });

  return (
    <OnboardingWizard
      title="Health insurance"
      description="Coverage details help estimate costs and route prior authorizations."
      isValid={true}
    >
      <div className="space-y-8">
        <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Plan</h3>
              <p className="text-sm text-muted-foreground">Choose the closest match — you can upload cards later from Records.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2 md:col-span-2">
              <Label>Coverage type</Label>
              <CatalogSelect
                setKey="insurance_coverage_type"
                options={catalog.insurance_coverage_type}
                loading={loading}
                value={data.insurance_coverage_type || ''}
                onValueChange={(v) => set('insurance_coverage_type', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Carrier / insurer</Label>
              <CatalogSelect
                setKey="insurance_carrier"
                options={catalog.insurance_carrier}
                loading={loading}
                value={data.insurance_carrier || ''}
                onValueChange={(v) => set('insurance_carrier', v)}
                placeholder="Select"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6 space-y-4">
          <h4 className="text-sm font-semibold">Coverage areas</h4>
          <p className="text-sm text-muted-foreground">What your plan includes (best-effort).</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(catalog.coverage_area || []).map((opt) => (
              <label
                key={opt.slug}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={selectedAreas.includes(opt.slug)}
                  onChange={(e) => toggleArea(opt.slug, e.target.checked)}
                  disabled={loading}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="space-y-2">
          <Label htmlFor="insurance_notes">Member ID, group number, notes</Label>
          <Textarea
            id="insurance_notes"
            placeholder="Member ID, group #, plan name, or anything helpful for your care team…"
            value={data.insurance || ''}
            onChange={(e) => set('insurance', e.target.value)}
            className="min-h-[140px] text-foreground bg-background"
          />
        </div>
      </div>
    </OnboardingWizard>
  );
}
