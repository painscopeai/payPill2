import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext.jsx';
import OnboardingWizard from './OnboardingWizard.jsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CatalogSelect from './CatalogSelect.jsx';
import { useProfileOptionCatalog } from '@/hooks/useProfileOptionCatalog.js';
import { Activity, Ruler } from 'lucide-react';

const KEYS = ['height_unit', 'weight_unit'];

export default function OnboardingStep3() {
  const { formData, updateFormData } = useOnboarding();
  const data = formData.step3 || {};
  const { catalog, loading } = useProfileOptionCatalog(KEYS);

  const handleChange = (field, value) => {
    const updates = { [field]: value };
    if (field === 'height' || field === 'weight') {
      const h = field === 'height' ? value : data.height;
      const w = field === 'weight' ? value : data.weight;
      const hu = data.height_unit || 'cm';
      const wu = data.weight_unit || 'kg';
      if (h && w && hu === 'cm' && wu === 'kg') {
        const heightInMeters = parseFloat(h) / 100;
        const wt = parseFloat(w);
        if (heightInMeters > 0 && wt > 0) {
          updates.bmi = (wt / (heightInMeters * heightInMeters)).toFixed(1);
        }
      }
    }
    updateFormData(3, updates);
  };

  return (
    <OnboardingWizard
      title="Body measurements & vitals"
      description="Numbers here establish baselines for trends and alerts."
      isValid={true}
    >
      <Tabs defaultValue="anthro" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="anthro" className="gap-2">
            <Ruler className="h-4 w-4" />
            Measurements
          </TabsTrigger>
          <TabsTrigger value="vitals" className="gap-2">
            <Activity className="h-4 w-4" />
            Vitals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="anthro" className="space-y-6 mt-0">
          <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6 space-y-5">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2 min-w-[140px]">
                <Label>Height unit</Label>
                <CatalogSelect
                  setKey="height_unit"
                  options={catalog.height_unit}
                  loading={loading}
                  value={data.height_unit || 'cm'}
                  onValueChange={(v) => handleChange('height_unit', v)}
                  placeholder="Unit"
                  className="w-[140px]"
                />
              </div>
              <div className="space-y-2 min-w-[140px]">
                <Label>Weight unit</Label>
                <CatalogSelect
                  setKey="weight_unit"
                  options={catalog.weight_unit}
                  loading={loading}
                  value={data.weight_unit || 'kg'}
                  onValueChange={(v) => handleChange('weight_unit', v)}
                  placeholder="Unit"
                  className="w-[140px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label>Height</Label>
                <Input
                  type="number"
                  step="any"
                  value={data.height || ''}
                  onChange={(e) => handleChange('height', e.target.value)}
                  placeholder={data.height_unit === 'ft-in' ? 'e.g. 66 inches total' : 'e.g. 170'}
                  className="text-foreground bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  {data.height_unit === 'ft-in' ? 'Enter total inches, or switch unit to cm.' : 'Centimeters recommended for precision.'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Weight</Label>
                <Input
                  type="number"
                  step="any"
                  value={data.weight || ''}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  className="text-foreground bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>BMI</Label>
                <Input value={data.bmi || ''} readOnly className="bg-muted/80 text-muted-foreground" />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>Waist (cm)</Label>
                <Input
                  type="number"
                  step="any"
                  value={data.waist_circumference || ''}
                  onChange={(e) => handleChange('waist_circumference', e.target.value)}
                  className="text-foreground bg-background"
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>Hip (cm)</Label>
                <Input
                  type="number"
                  step="any"
                  value={data.hip_circumference || ''}
                  onChange={(e) => handleChange('hip_circumference', e.target.value)}
                  className="text-foreground bg-background"
                />
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="vitals" className="space-y-6 mt-0">
          <section className="rounded-2xl border border-border/80 bg-muted/15 p-5 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Resting heart rate (bpm)</Label>
                <Input
                  type="number"
                  value={data.resting_heart_rate || ''}
                  onChange={(e) => handleChange('resting_heart_rate', e.target.value)}
                  className="text-foreground bg-background"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Blood pressure</Label>
                <div className="flex gap-2 items-center max-w-xs">
                  <Input
                    type="number"
                    placeholder="Systolic"
                    value={data.blood_pressure_systolic || ''}
                    onChange={(e) => handleChange('blood_pressure_systolic', e.target.value)}
                    className="text-foreground bg-background"
                  />
                  <span className="text-muted-foreground">/</span>
                  <Input
                    type="number"
                    placeholder="Diastolic"
                    value={data.blood_pressure_diastolic || ''}
                    onChange={(e) => handleChange('blood_pressure_diastolic', e.target.value)}
                    className="text-foreground bg-background"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Oxygen saturation (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={data.oxygen_saturation || ''}
                  onChange={(e) => handleChange('oxygen_saturation', e.target.value)}
                  className="text-foreground bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Body temperature (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={data.body_temperature || ''}
                  onChange={(e) => handleChange('body_temperature', e.target.value)}
                  className="text-foreground bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Respiratory rate (/min)</Label>
                <Input
                  type="number"
                  value={data.respiratory_rate || ''}
                  onChange={(e) => handleChange('respiratory_rate', e.target.value)}
                  className="text-foreground bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Fasting glucose baseline (mg/dL)</Label>
                <Input
                  type="number"
                  value={data.blood_sugar_baseline || ''}
                  onChange={(e) => handleChange('blood_sugar_baseline', e.target.value)}
                  className="text-foreground bg-background"
                />
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </OnboardingWizard>
  );
}
