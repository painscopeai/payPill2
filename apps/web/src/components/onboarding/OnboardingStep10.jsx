import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProfileOptionCatalog } from '@/hooks/useProfileOptionCatalog.js';
import { FlaskConical } from 'lucide-react';

const KEYS = ['lab_tests'];

export default function OnboardingStep10() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step10 || {};
  const { catalog, loading } = useProfileOptionCatalog(KEYS);

  const selected = Array.isArray(data.lab_slugs) ? data.lab_slugs : [];

  const toggle = (slug, checked) => {
    const arr = [...selected];
    if (checked) {
      if (!arr.includes(slug)) arr.push(slug);
    } else {
      const i = arr.indexOf(slug);
      if (i >= 0) arr.splice(i, 1);
    }
    updateFormData(10, { lab_slugs: arr });
  };

  return (
    <OnboardingWizard
      title="Lab history"
      description="Recent labs anchor chronic disease monitoring and medication safety."
      isValid={true}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Tests you have had</h3>
              <p className="text-sm text-muted-foreground">Select categories; add values and dates below.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(catalog.lab_tests || []).map((opt) => (
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
          <Label htmlFor="labs_notes">Results summary</Label>
          <Textarea
            id="labs_notes"
            placeholder="e.g. HbA1c 6.2% (March 2025); LDL 98 mg/dL"
            value={data.labs || ''}
            onChange={(e) => updateFormData(10, { labs: e.target.value })}
            className="min-h-[140px] text-foreground bg-background"
          />
        </div>
      </div>
    </OnboardingWizard>
  );
}
