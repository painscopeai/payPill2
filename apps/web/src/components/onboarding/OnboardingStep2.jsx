import React, { useMemo } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import CatalogSelect from './CatalogSelect.jsx';
import { useProfileOptionCatalog } from '@/hooks/useProfileOptionCatalog.js';
import { UserCircle2, Heart, Baby } from 'lucide-react';

const CATALOG_KEYS = [
  'sex_assigned_at_birth',
  'gender_identity',
  'marital_status',
  'ethnicity',
  'race',
  'blood_group',
  'genotype',
  'pregnancy_status',
  'breastfeeding_status',
  'menstrual_status',
  'menopause_status',
  'disability_support',
];

export default function OnboardingStep2() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step2 || {};
  const { catalog, loading } = useProfileOptionCatalog(CATALOG_KEYS);

  const disabilitySlugs = useMemo(() => (catalog.disability_support || []).map((o) => o.slug), [catalog.disability_support]);

  const calculateAge = (dob) => {
    if (!dob) return '';
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return '';
    let age = new Date().getFullYear() - d.getFullYear();
    const m = new Date().getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) age--;
    return String(age);
  };

  const handleChange = (field, value) => {
    const updates = { [field]: value };
    if (field === 'date_of_birth') {
      updates.age = calculateAge(value);
    }
    updateFormData(2, updates);
  };

  const toggleDisability = (slug, checked) => {
    const raw = data.disability_slugs;
    const arr = Array.isArray(raw) ? [...raw] : [];
    if (checked) {
      if (!arr.includes(slug)) arr.push(slug);
    } else {
      const i = arr.indexOf(slug);
      if (i >= 0) arr.splice(i, 1);
    }
    updateFormData(2, { disability_slugs: arr });
  };

  const isValid = data.date_of_birth && data.sex_assigned_at_birth;

  return (
    <OnboardingWizard
      title="Basic health information"
      description="Demographics help us tailor dosing, screenings, and education to you."
      isValid={!!isValid}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Identity</h3>
              <p className="text-sm text-muted-foreground">Required fields power age-based risk models.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="dob">Date of birth *</Label>
              <Input
                id="dob"
                type="date"
                value={data.date_of_birth || ''}
                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                className="text-foreground bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" value={data.age || ''} readOnly className="bg-muted/80 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label>Sex assigned at birth *</Label>
              <CatalogSelect
                setKey="sex_assigned_at_birth"
                options={catalog.sex_assigned_at_birth}
                loading={loading}
                value={data.sex_assigned_at_birth || ''}
                onValueChange={(v) => handleChange('sex_assigned_at_birth', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2">
              <Label>Gender identity</Label>
              <CatalogSelect
                setKey="gender_identity"
                options={catalog.gender_identity}
                loading={loading}
                value={data.gender_identity || ''}
                onValueChange={(v) => handleChange('gender_identity', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2">
              <Label>Marital status</Label>
              <CatalogSelect
                setKey="marital_status"
                options={catalog.marital_status}
                loading={loading}
                value={data.marital_status || ''}
                onValueChange={(v) => handleChange('marital_status', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2">
              <Label>Ethnicity</Label>
              <CatalogSelect
                setKey="ethnicity"
                options={catalog.ethnicity}
                loading={loading}
                value={data.ethnicity || ''}
                onValueChange={(v) => handleChange('ethnicity', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Race</Label>
              <CatalogSelect
                setKey="race"
                options={catalog.race}
                loading={loading}
                value={data.race || ''}
                onValueChange={(v) => handleChange('race', v)}
                placeholder="Select"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Blood type</h3>
              <p className="text-sm text-muted-foreground">Used for emergency care coordination.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Blood group</Label>
              <CatalogSelect
                setKey="blood_group"
                options={catalog.blood_group}
                loading={loading}
                value={data.blood_group || ''}
                onValueChange={(v) => handleChange('blood_group', v)}
                placeholder="Select"
              />
            </div>
            <div className="space-y-2">
              <Label>Sickle cell genotype</Label>
              <CatalogSelect
                setKey="genotype"
                options={catalog.genotype}
                loading={loading}
                value={data.genotype || ''}
                onValueChange={(v) => handleChange('genotype', v)}
                placeholder="Select"
              />
            </div>
          </div>
        </section>

        <Accordion type="multiple" className="rounded-2xl border border-border/80 px-2 bg-muted/10">
          <AccordionItem value="repro" className="border-border/60">
            <AccordionTrigger className="text-left hover:no-underline py-4">
              <div className="flex items-center gap-2">
                <Baby className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium">Reproductive health</span>
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="space-y-2">
                  <Label>Pregnancy status</Label>
                  <CatalogSelect
                    setKey="pregnancy_status"
                    options={catalog.pregnancy_status}
                    loading={loading}
                    value={data.pregnancy_status || ''}
                    onValueChange={(v) => handleChange('pregnancy_status', v)}
                    placeholder="Select"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Breastfeeding</Label>
                  <CatalogSelect
                    setKey="breastfeeding_status"
                    options={catalog.breastfeeding_status}
                    loading={loading}
                    value={data.breastfeeding_status || ''}
                    onValueChange={(v) => handleChange('breastfeeding_status', v)}
                    placeholder="Select"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Menstrual status</Label>
                  <CatalogSelect
                    setKey="menstrual_status"
                    options={catalog.menstrual_status}
                    loading={loading}
                    value={data.menstrual_status || ''}
                    onValueChange={(v) => handleChange('menstrual_status', v)}
                    placeholder="Select"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Menopause status</Label>
                  <CatalogSelect
                    setKey="menopause_status"
                    options={catalog.menopause_status}
                    loading={loading}
                    value={data.menopause_status || ''}
                    onValueChange={(v) => handleChange('menopause_status', v)}
                    placeholder="Select"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6 space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Disability / accessibility</h4>
          <p className="text-sm text-muted-foreground">Select any that apply — used only to improve accessibility of care.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(catalog.disability_support || []).map((opt) => {
              const checked = Array.isArray(data.disability_slugs) && data.disability_slugs.includes(opt.slug);
              return (
                <label
                  key={opt.slug}
                  className="flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={!!checked}
                    onChange={(e) => toggleDisability(opt.slug, e.target.checked)}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              );
            })}
            {!loading && disabilitySlugs.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">Disability options load from your administrator.</p>
            ) : null}
          </div>
        </section>
      </div>
    </OnboardingWizard>
  );
}
