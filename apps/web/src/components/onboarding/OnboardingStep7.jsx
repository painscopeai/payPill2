import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProfileOptionCatalog } from '@/hooks/useProfileOptionCatalog.js';
import { Users } from 'lucide-react';

const KEYS = ['family_history_conditions'];

export default function OnboardingStep7() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step7 || {};
  const { catalog, loading } = useProfileOptionCatalog(KEYS);

  const selected = Array.isArray(data.family_conditions_slugs) ? data.family_conditions_slugs : [];

  const toggle = (slug, checked) => {
    const arr = [...selected];
    if (checked) {
      if (!arr.includes(slug)) arr.push(slug);
    } else {
      const i = arr.indexOf(slug);
      if (i >= 0) arr.splice(i, 1);
    }
    updateFormData(7, { family_conditions_slugs: arr });
  };

  return (
    <OnboardingWizard
      title="Family medical history"
      description="Patterns in family history inform screening intervals and risk awareness."
      isValid={true}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Conditions in first-degree relatives</h3>
              <p className="text-sm text-muted-foreground">Select any that apply to biological parents or siblings.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(catalog.family_history_conditions || []).map((opt) => (
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
          <Label htmlFor="family_details">Details & ages</Label>
          <Textarea
            id="family_details"
            placeholder="e.g. Mother — breast cancer at 52; Father — type 2 diabetes"
            value={data.family_history || ''}
            onChange={(e) => updateFormData(7, { family_history: e.target.value })}
            className="min-h-[140px] text-foreground bg-background"
          />
        </div>
      </div>
    </OnboardingWizard>
  );
}
