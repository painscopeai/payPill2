import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProfileOptionCatalog } from '@/hooks/useProfileOptionCatalog.js';
import { CONDITION_GROUPS, CONDITION_CATALOG_KEYS } from './conditionGroups.js';
import { Stethoscope } from 'lucide-react';

export default function OnboardingStep4() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step4 || {};
  const { catalog, loading } = useProfileOptionCatalog(CONDITION_CATALOG_KEYS);

  const conditionsByCategory = data.conditions_by_category && typeof data.conditions_by_category === 'object'
    ? data.conditions_by_category
    : {};

  const toggleCondition = (categoryKey, slug, checked) => {
    const prev = Array.isArray(conditionsByCategory[categoryKey]) ? [...conditionsByCategory[categoryKey]] : [];
    if (checked) {
      if (!prev.includes(slug)) prev.push(slug);
    } else {
      const i = prev.indexOf(slug);
      if (i >= 0) prev.splice(i, 1);
    }
    updateFormData(4, {
      conditions_by_category: { ...conditionsByCategory, [categoryKey]: prev },
    });
  };

  const handleChange = (field, value) => {
    updateFormData(4, { [field]: value });
  };

  return (
    <OnboardingWizard
      title="Pre-existing conditions"
      description="Select conditions that apply to you. You can add notes for your care team below."
      isValid={true}
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Condition checklist</h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Tick anything you have been diagnosed with or are managing. This helps clinical safety checks and AI insights.
              </p>
            </div>
          </div>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {CONDITION_GROUPS.map(({ key, title }) => {
            const options = catalog[key] || [];
            const selected = Array.isArray(conditionsByCategory[key]) ? conditionsByCategory[key] : [];
            return (
              <AccordionItem key={key} value={key} className="rounded-xl border border-border/70 bg-card px-3">
                <AccordionTrigger className="hover:no-underline py-4 text-left">
                  <span className="font-medium">{title}</span>
                  {selected.length > 0 ? (
                    <span className="ml-2 text-xs font-normal text-primary">({selected.length} selected)</span>
                  ) : null}
                </AccordionTrigger>
                <AccordionContent>
                  {loading && !options.length ? (
                    <p className="text-sm text-muted-foreground py-2">Loading options…</p>
                  ) : (
                    <ScrollArea className="max-h-56 pr-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
                        {options.map((opt) => {
                          const checked = selected.includes(opt.slug);
                          return (
                            <label
                              key={opt.slug}
                              className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40 transition-colors"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 shrink-0 rounded border-input"
                                checked={checked}
                                onChange={(e) => toggleCondition(key, opt.slug, e.target.checked)}
                              />
                              <span>{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="space-y-2">
          <Label htmlFor="conditions_notes">Additional notes</Label>
          <Textarea
            id="conditions_notes"
            placeholder="Dates of diagnosis, severity, treating clinician, or anything else we should know…"
            value={data.conditions_notes || ''}
            onChange={(e) => handleChange('conditions_notes', e.target.value)}
            className="min-h-[120px] text-foreground bg-background"
          />
        </div>
      </div>
    </OnboardingWizard>
  );
}
