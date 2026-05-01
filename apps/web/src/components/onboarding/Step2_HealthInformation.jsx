import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function Step2_HealthInformation({ data, updateData, errors }) {
  
  useEffect(() => {
    if (data.date_of_birth) {
      const dob = new Date(data.date_of_birth);
      const ageDiff = Date.now() - dob.getTime();
      const ageDate = new Date(ageDiff);
      const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (calculatedAge !== data.age) {
        updateData({ age: calculatedAge });
      }
    }
  }, [data.date_of_birth, updateData, data.age]);

  useEffect(() => {
    if (data.height && data.weight) {
      const h = parseFloat(data.height) / 100; // cm to m
      const w = parseFloat(data.weight);
      if (h > 0 && w > 0) {
        const bmi = (w / (h * h)).toFixed(1);
        if (bmi !== data.bmi) updateData({ bmi });
      }
    }
  }, [data.height, data.weight, updateData, data.bmi]);

  const getBmiColor = (bmi) => {
    if (!bmi) return 'text-muted-foreground';
    if (bmi < 18.5) return 'text-blue-500';
    if (bmi < 25) return 'text-emerald-500';
    if (bmi < 30) return 'text-yellow-500';
    return 'text-destructive';
  };

  const races = ['American Indian or Alaska Native', 'Asian', 'Black or African American', 'Native Hawaiian or Other Pacific Islander', 'White', 'Other'];

  const toggleRace = (r) => {
    const current = data.race || [];
    const updated = current.includes(r) ? current.filter(x => x !== r) : [...current, r];
    updateData({ race: updated });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Basic Health Information</h2>
        <p className="text-muted-foreground mt-1">Provide your baseline health metrics to help us tailor your experience.</p>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold border-b pb-2">Personal Demographics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label>Date of Birth *</Label>
            <Input type="date" value={data.date_of_birth || ''} onChange={e => updateData({ date_of_birth: e.target.value })} className={errors.date_of_birth ? 'border-destructive' : ''} max={new Date().toISOString().split('T')[0]} />
            {errors.date_of_birth && <p className="text-xs text-destructive">{errors.date_of_birth}</p>}
          </div>
          <div className="space-y-2">
            <Label>Age</Label>
            <Input value={data.age || ''} readOnly className="bg-muted text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label>Sex Assigned at Birth *</Label>
            <Select value={data.sex_assigned_at_birth || ''} onValueChange={v => updateData({ sex_assigned_at_birth: v })}>
              <SelectTrigger className={errors.sex_assigned_at_birth ? 'border-destructive' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Intersex">Intersex</SelectItem>
              </SelectContent>
            </Select>
            {errors.sex_assigned_at_birth && <p className="text-xs text-destructive">{errors.sex_assigned_at_birth}</p>}
          </div>
          <div className="space-y-2">
            <Label>Gender Identity *</Label>
            <Select value={data.gender_identity || ''} onValueChange={v => updateData({ gender_identity: v })}>
              <SelectTrigger className={errors.gender_identity ? 'border-destructive' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Man">Man</SelectItem>
                <SelectItem value="Woman">Woman</SelectItem>
                <SelectItem value="Non-binary">Non-binary</SelectItem>
                <SelectItem value="Prefer to self-describe">Prefer to self-describe</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender_identity && <p className="text-xs text-destructive">{errors.gender_identity}</p>}
          </div>
          <div className="space-y-2">
            <Label>Marital Status</Label>
            <Select value={data.marital_status || ''} onValueChange={v => updateData({ marital_status: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Married">Married</SelectItem>
                <SelectItem value="Divorced">Divorced</SelectItem>
                <SelectItem value="Widowed">Widowed</SelectItem>
                <SelectItem value="Domestic Partnership">Domestic Partnership</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ethnicity</Label>
            <Select value={data.ethnicity || ''} onValueChange={v => updateData({ ethnicity: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Hispanic or Latino">Hispanic or Latino</SelectItem>
                <SelectItem value="Not Hispanic or Latino">Not Hispanic or Latino</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-3 pt-2">
          <Label>Race (Select all that apply)</Label>
          <div className="flex flex-wrap gap-4">
            {races.map(r => (
              <div key={r} className="flex items-center space-x-2">
                <Checkbox id={`race_${r}`} checked={(data.race || []).includes(r)} onCheckedChange={() => toggleRace(r)} />
                <Label htmlFor={`race_${r}`} className="font-normal cursor-pointer text-sm">{r}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-lg font-semibold border-b pb-2">Blood & Measurements</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Blood Group *</Label>
              <Select value={data.blood_group || ''} onValueChange={v => updateData({ blood_group: v })}>
                <SelectTrigger className={errors.blood_group ? 'border-destructive' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.blood_group && <p className="text-xs text-destructive">{errors.blood_group}</p>}
            </div>
            <div className="space-y-2">
              <Label>Genotype</Label>
              <Select value={data.genotype || ''} onValueChange={v => updateData({ genotype: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['AA', 'AS', 'SS', 'AC', 'SC', 'Unknown'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Height (cm) *</Label>
              <Input type="number" value={data.height || ''} onChange={e => updateData({ height: e.target.value })} className={errors.height ? 'border-destructive' : ''} />
              {errors.height && <p className="text-xs text-destructive">{errors.height}</p>}
            </div>
            <div className="space-y-2">
              <Label>Weight (kg) *</Label>
              <Input type="number" value={data.weight || ''} onChange={e => updateData({ weight: e.target.value })} className={errors.weight ? 'border-destructive' : ''} />
              {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
            </div>
            <div className="space-y-2">
              <Label>Calculated BMI</Label>
              <div className={`h-9 px-3 py-1 flex items-center rounded-md border bg-muted font-medium ${getBmiColor(data.bmi)}`}>
                {data.bmi || '--'}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Waist Circ. (cm)</Label>
              <Input type="number" value={data.waist_circumference || ''} onChange={e => updateData({ waist_circumference: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold border-b pb-2">Vital Baseline</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Resting HR (bpm)</Label>
              <Input type="number" placeholder="60-100" value={data.resting_heart_rate || ''} onChange={e => updateData({ resting_heart_rate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Blood Pressure</Label>
              <div className="flex items-center gap-2">
                <Input type="number" placeholder="120" value={data.blood_pressure_systolic || ''} onChange={e => updateData({ blood_pressure_systolic: e.target.value })} />
                <span className="text-muted-foreground">/</span>
                <Input type="number" placeholder="80" value={data.blood_pressure_diastolic || ''} onChange={e => updateData({ blood_pressure_diastolic: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Oxygen Sat. (%)</Label>
              <Input type="number" placeholder="95-100" value={data.oxygen_saturation || ''} onChange={e => updateData({ oxygen_saturation: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Temp (°C)</Label>
              <Input type="number" placeholder="36.5" step="0.1" value={data.body_temperature || ''} onChange={e => updateData({ body_temperature: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Resp. Rate (/min)</Label>
              <Input type="number" placeholder="12-20" value={data.respiratory_rate || ''} onChange={e => updateData({ respiratory_rate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Blood Sugar (mg/dL)</Label>
              <Input type="number" placeholder="70-100" value={data.blood_sugar_baseline || ''} onChange={e => updateData({ blood_sugar_baseline: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      {data.sex_assigned_at_birth === 'Female' && (
        <div className="space-y-6 pt-4 border-t">
          <h3 className="text-lg font-semibold border-b pb-2">Reproductive Health</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
            <div className="space-y-2">
              <Label>Pregnancy Status</Label>
              <Select value={data.pregnancy_status || ''} onValueChange={v => updateData({ pregnancy_status: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Pregnant">Not Pregnant</SelectItem>
                  <SelectItem value="Pregnant">Pregnant</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Breastfeeding</Label>
              <Select value={data.breastfeeding_status || ''} onValueChange={v => updateData({ breastfeeding_status: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Menstrual Status</Label>
              <Select value={data.menstrual_status || ''} onValueChange={v => updateData({ menstrual_status: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Irregular">Irregular</SelectItem>
                  <SelectItem value="Amenorrhea">Amenorrhea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Menopause Status</Label>
              <Select value={data.menopause_status || ''} onValueChange={v => updateData({ menopause_status: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pre-menopause">Pre-menopause</SelectItem>
                  <SelectItem value="Peri-menopause">Peri-menopause</SelectItem>
                  <SelectItem value="Post-menopause">Post-menopause</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 pt-4 border-t">
        <h3 className="text-lg font-semibold border-b pb-2">Disability & Accessibility</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[
              { id: 'vision_impairment', label: 'Vision Impairment' },
              { id: 'hearing_impairment', label: 'Hearing Impairment' },
              { id: 'mobility_limitation', label: 'Mobility Limitation' },
              { id: 'speech_impairment', label: 'Speech Impairment' },
              { id: 'cognitive_support_needs', label: 'Cognitive Support Needs' }
            ].map(item => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox id={item.id} checked={data[item.id] || false} onCheckedChange={v => updateData({ [item.id]: v })} />
                <Label htmlFor={item.id} className="font-normal cursor-pointer">{item.label}</Label>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Additional Accessibility Notes</Label>
            <Textarea 
              placeholder="Any specific accommodations needed..." 
              value={data.accessibility_notes || ''} 
              onChange={e => updateData({ accessibility_notes: e.target.value })}
              className="h-32"
            />
          </div>
        </div>
      </div>
    </div>
  );
}