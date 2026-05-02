import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProfileOptionCatalog } from '@/hooks/useProfileOptionCatalog.js';
import { Syringe } from 'lucide-react';

const KEYS = ['immunization_vaccines'];

export default function OnboardingStep9() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step9 || {};
  const { catalog, loading } = useProfileOptionCatalog(KEYS);

  const selected = Array.isArray(data.immunization_slugs) ? data.immunization_slugs : [];

  const toggle = (slug, checked) => {
    const arr = [...selected];
    if (checked) {
      if (!arr.includes(slug)) arr.push(slug);
    } else {
      const i = arr.indexOf(slug);
      if (i >= 0) arr.splice(i, 1);
    }
    updateFormData(9, { immunization_slugs: arr });
  };

  return (
    <OnboardingWizard
      title="Immunization history"
      description="Vaccination status helps with catch-up recommendations and travel health."
      isValid={true}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Syringe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Vaccines you have received</h3>
              <p className="text-sm text-muted-foreground">Select all that apply; add years in the notes if you remember.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(catalog.immunization_vaccines || []).map((opt) => (
              <label
                key={opt.slug}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={selected.includes(opt.slug)}
                  onChange={(e) => toggle(opt.slug, e.target.checked)}
                  disabled={loading}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </section>
        <div className="space-y-2">
          <Label htmlFor="immunizations_notes">Dates & details</Label>
          <Textarea
            id="immunizations_notes"
            placeholder="e.g. COVID-19 bivalent — Fall 2024"
            value={data.immunizations || ''}
            onChange={(e) => updateFormData(9, { immunizations: e.target.value })}
            className="min-h-[120px] text-foreground bg-background"
          />
        </div>
      </div>
    </OnboardingWizard>
  );
}
