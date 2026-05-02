import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import CatalogSelect from './CatalogSelect.jsx';
import { useProfileOptionCatalog } from '@/hooks/useProfileOptionCatalog.js';
import { Leaf } from 'lucide-react';

const KEYS = [
  'exercise_level',
  'smoking_status',
  'alcohol_use',
  'substance_use',
  'diet_pattern',
  'sleep_quality',
  'stress_level',
];

export default function OnboardingStep11() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step11 || {};
  const { catalog, loading } = useProfileOptionCatalog(KEYS);

  const set = (field, value) => updateFormData(11, { [field]: value });

  return (
    <OnboardingWizard
      title="Habits & lifestyle"
      description="Behaviour patterns influence medication choices, counseling, and preventive care."
      isValid={true}
    >
      <div className="space-y-8">
        <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent p-5 md:p-6 flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            <Leaf className="h-5 w-5" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Estimates are fine — update these anytime as your habits change.
          </p>
        </div>

        <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Activity & substances</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Physical activity</Label>
              <CatalogSelect
                setKey="exercise_level"
                options={catalog.exercise_level}
                loading={loading}
                value={data.exercise_level || ''}
                onValueChange={(v) => set('exercise_level', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2">
              <Label>Smoking / tobacco</Label>
              <CatalogSelect
                setKey="smoking_status"
                options={catalog.smoking_status}
                loading={loading}
                value={data.smoking_status || ''}
                onValueChange={(v) => set('smoking_status', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2">
              <Label>Alcohol</Label>
              <CatalogSelect
                setKey="alcohol_use"
                options={catalog.alcohol_use}
                loading={loading}
                value={data.alcohol_use || ''}
                onValueChange={(v) => set('alcohol_use', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2">
              <Label>Substance use</Label>
              <CatalogSelect
                setKey="substance_use"
                options={catalog.substance_use}
                loading={loading}
                value={data.substance_use || ''}
                onValueChange={(v) => set('substance_use', v)}
                placeholder="Select"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Nutrition & wellbeing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Diet pattern</Label>
              <CatalogSelect
                setKey="diet_pattern"
                options={catalog.diet_pattern}
                loading={loading}
                value={data.diet_pattern || ''}
                onValueChange={(v) => set('diet_pattern', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2">
              <Label>Sleep quality</Label>
              <CatalogSelect
                setKey="sleep_quality"
                options={catalog.sleep_quality}
                loading={loading}
                value={data.sleep_quality || ''}
                onValueChange={(v) => set('sleep_quality', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Stress level</Label>
              <CatalogSelect
                setKey="stress_level"
                options={catalog.stress_level}
                loading={loading}
                value={data.stress_level || ''}
                onValueChange={(v) => set('stress_level', v)}
                placeholder="Select"
              />
            </div>
          </div>
        </section>

        <div className="space-y-2">
          <Label htmlFor="lifestyle_free">Free-form notes</Label>
          <Textarea
            id="lifestyle_free"
            placeholder="Exercise routine, meal timing, caregiving load, night shifts…"
            value={data.lifestyle || ''}
            onChange={(e) => set('lifestyle', e.target.value)}
            className="min-h-[120px] text-foreground bg-background"
          />
        </div>
      </div>
    </OnboardingWizard>
  );
}
