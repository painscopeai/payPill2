import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import CatalogSelect from './CatalogSelect.jsx';
import { useProfileOptionCatalog } from '@/hooks/useProfileOptionCatalog.js';
import { AlertTriangle } from 'lucide-react';

const KEYS = ['allergy_type', 'allergy_severity'];

export default function OnboardingStep6() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step6 || {};
  const { catalog, loading } = useProfileOptionCatalog(KEYS);

  const selectedTypes = Array.isArray(data.allergy_type_slugs) ? data.allergy_type_slugs : [];

  const toggleType = (slug, checked) => {
    const arr = [...selectedTypes];
    if (checked) {
      if (!arr.includes(slug)) arr.push(slug);
    } else {
      const i = arr.indexOf(slug);
      if (i >= 0) arr.splice(i, 1);
    }
    updateFormData(6, { allergy_type_slugs: arr });
  };

  return (
    <OnboardingWizard
      title="Allergies"
      description="Drug and food allergies affect prescribing — accuracy matters."
      isValid={true}
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Include reactions that required urgent care or ER visits. You can upload allergy documents later from Records.
          </p>
        </div>

        <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6 space-y-4">
          <h4 className="text-sm font-semibold">Allergy categories</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(catalog.allergy_type || []).map((opt) => (
              <label
                key={opt.slug}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={selectedTypes.includes(opt.slug)}
                  onChange={(e) => toggleType(opt.slug, e.target.checked)}
                  disabled={loading}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="max-w-md space-y-2 pt-2">
            <Label>Typical reaction severity</Label>
            <CatalogSelect
              setKey="allergy_severity"
              options={catalog.allergy_severity}
              loading={loading}
              value={data.allergy_severity || ''}
              onValueChange={(v) => updateFormData(6, { allergy_severity: v })}
              placeholder="If varies, choose worst known"
            />
          </div>
        </section>

        <div className="space-y-2">
          <Label htmlFor="allergies_detail">Allergens & reactions</Label>
          <Textarea
            id="allergies_detail"
            placeholder="e.g. Penicillin — hives / shortness of breath (ED visit 2019); Peanuts — anaphylaxis — carries epinephrine"
            value={data.allergies_list || ''}
            onChange={(e) => updateFormData(6, { allergies_list: e.target.value })}
            className="min-h-[160px] text-foreground bg-background"
          />
        </div>
      </div>
    </OnboardingWizard>
  );
}
