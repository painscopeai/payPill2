import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Step10_HabitsLifestyle({ initialData, onNext, onBack, isSubmitting }) {
  const [formData, setFormData] = useState({
    exercise_level: initialData?.exercise_level || '',
    daily_activity_level: initialData?.daily_activity_level || '',
    workout_frequency: initialData?.workout_frequency || '',
    exercise_types: initialData?.exercise_types || [],
    
    smoking_status: initialData?.smoking_status || '',
    vaping: initialData?.vaping || false,
    smokeless_tobacco: initialData?.smokeless_tobacco || false,
    packs_per_day: initialData?.packs_per_day || '',
    years_smoked: initialData?.years_smoked || '',
    years_since_quit: initialData?.years_since_quit || '',

    alcohol_status: initialData?.alcohol_status || '',
    alcohol_types: initialData?.alcohol_types || [],
    units_per_week: initialData?.units_per_week || '',

    recreational_drugs: initialData?.recreational_drugs || false,
    prescription_misuse: initialData?.prescription_misuse || false,
    cannabis: initialData?.cannabis || false,
    opioid_use: initialData?.opioid_use || false,
    other_substances: initialData?.other_substances || '',

    diet_preference: initialData?.diet_preference || '',
    meal_frequency: initialData?.meal_frequency || '',

    average_sleep_duration: initialData?.average_sleep_duration || '',
    insomnia: initialData?.insomnia || false,
    snoring: initialData?.snoring || false,
    sleep_apnea: initialData?.sleep_apnea || false,
    sleep_quality: initialData?.sleep_quality || '',

    sexually_active: initialData?.sexually_active || '',
    protection_use: initialData?.protection_use || '',
    sti_history: initialData?.sti_history || false,
    family_planning: initialData?.family_planning || '',

    stress_level: initialData?.stress_level || 5,
    water_intake: initialData?.water_intake || '',
    screen_time: initialData?.screen_time || '',
    work_type: initialData?.work_type || '',
    sedentary_hours: initialData?.sedentary_hours || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field, value) => {
    const current = formData[field] || [];
    const updated = current.includes(value) 
      ? current.filter(item => item !== value)
      : [...current, value];
    handleChange(field, updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Complex validation could go here if needed
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Physical Activity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <div className="space-y-2">
              <Label>Exercise Level</Label>
              <Select value={formData.exercise_level} onValueChange={(v) => handleChange('exercise_level', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Light">Light</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Intense">Intense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Daily Activity Level</Label>
              <Select value={formData.daily_activity_level} onValueChange={(v) => handleChange('daily_activity_level', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sedentary">Sedentary</SelectItem>
                  <SelectItem value="Lightly Active">Lightly Active</SelectItem>
                  <SelectItem value="Moderately Active">Moderately Active</SelectItem>
                  <SelectItem value="Very Active">Very Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Workout Frequency</Label>
              <Select value={formData.workout_frequency} onValueChange={(v) => handleChange('workout_frequency', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Never">Never</SelectItem>
                  <SelectItem value="1-2 times/week">1-2 times/week</SelectItem>
                  <SelectItem value="3-4 times/week">3-4 times/week</SelectItem>
                  <SelectItem value="5-6 times/week">5-6 times/week</SelectItem>
                  <SelectItem value="Daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 md:col-span-2 pt-2">
              <Label>Exercise Types</Label>
              <div className="flex flex-wrap gap-4">
                {['Walking', 'Running', 'Cycling', 'Swimming', 'Strength Training', 'Yoga', 'Sports', 'Other'].map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox id={`ex_${type}`} checked={formData.exercise_types.includes(type)} onCheckedChange={() => handleArrayToggle('exercise_types', type)} />
                    <Label htmlFor={`ex_${type}`} className="font-normal cursor-pointer">{type}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground">Smoking & Tobacco</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Smoking Status</Label>
              <Select value={formData.smoking_status} onValueChange={(v) => handleChange('smoking_status', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Never smoked">Never smoked</SelectItem>
                  <SelectItem value="Former smoker">Former smoker</SelectItem>
                  <SelectItem value="Current smoker">Current smoker</SelectItem>
                  <SelectItem value="Occasionally">Occasionally</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="vaping" checked={formData.vaping} onCheckedChange={(c) => handleChange('vaping', c)} />
                  <Label htmlFor="vaping" className="font-normal cursor-pointer">Vaping</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="smokeless" checked={formData.smokeless_tobacco} onCheckedChange={(c) => handleChange('smokeless_tobacco', c)} />
                  <Label htmlFor="smokeless" className="font-normal cursor-pointer">Smokeless Tobacco</Label>
                </div>
              </div>
            </div>
            
            {formData.smoking_status === 'Current smoker' && (
              <>
                <div className="space-y-2">
                  <Label>Packs Per Day</Label>
                  <Input type="number" step="0.1" value={formData.packs_per_day} onChange={(e) => handleChange('packs_per_day', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Years Smoked</Label>
                  <Input type="number" value={formData.years_smoked} onChange={(e) => handleChange('years_smoked', e.target.value)} />
                </div>
              </>
            )}

            {formData.smoking_status === 'Former smoker' && (
              <div className="space-y-2">
                <Label>Years Since Quit</Label>
                <Input type="number" value={formData.years_since_quit} onChange={(e) => handleChange('years_since_quit', e.target.value)} />
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground">Alcohol & Substance Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Alcohol Status</Label>
              <Select value={formData.alcohol_status} onValueChange={(v) => handleChange('alcohol_status', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Never">Never</SelectItem>
                  <SelectItem value="Occasionally">Occasionally</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Heavy use">Heavy use</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.alcohol_status && formData.alcohol_status !== 'Never' && (
              <>
                <div className="space-y-3 md:col-span-2">
                  <Label>Type of Alcohol</Label>
                  <div className="flex flex-wrap gap-4">
                    {['Beer', 'Wine', 'Spirits', 'Other'].map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox id={`alc_${type}`} checked={formData.alcohol_types.includes(type)} onCheckedChange={() => handleArrayToggle('alcohol_types', type)} />
                        <Label htmlFor={`alc_${type}`} className="font-normal cursor-pointer">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Estimated Units Per Week</Label>
                  <Input type="number" value={formData.units_per_week} onChange={(e) => handleChange('units_per_week', e.target.value)} />
                </div>
              </>
            )}

            <div className="space-y-3 md:col-span-2 pt-2">
              <Label>Substance Use (Check all that apply)</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="rec_drugs" checked={formData.recreational_drugs} onCheckedChange={(c) => handleChange('recreational_drugs', c)} />
                  <Label htmlFor="rec_drugs" className="font-normal cursor-pointer">Recreational Drugs</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="pres_misuse" checked={formData.prescription_misuse} onCheckedChange={(c) => handleChange('prescription_misuse', c)} />
                  <Label htmlFor="pres_misuse" className="font-normal cursor-pointer">Prescription Misuse</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="cannabis" checked={formData.cannabis} onCheckedChange={(c) => handleChange('cannabis', c)} />
                  <Label htmlFor="cannabis" className="font-normal cursor-pointer">Cannabis</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="opioid" checked={formData.opioid_use} onCheckedChange={(c) => handleChange('opioid_use', c)} />
                  <Label htmlFor="opioid" className="font-normal cursor-pointer">Opioid Use</Label>
                </div>
              </div>
              <div className="mt-2">
                <Input placeholder="Other Substances (Optional)" value={formData.other_substances} onChange={(e) => handleChange('other_substances', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground">Diet & Sleep</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <div className="space-y-2">
              <Label>Diet Preference</Label>
              <Select value={formData.diet_preference} onValueChange={(v) => handleChange('diet_preference', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Omnivore">Omnivore</SelectItem>
                  <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="Vegan">Vegan</SelectItem>
                  <SelectItem value="Low Salt">Low Salt</SelectItem>
                  <SelectItem value="Low Sugar">Low Sugar</SelectItem>
                  <SelectItem value="Renal Diet">Renal Diet</SelectItem>
                  <SelectItem value="High Protein">High Protein</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meal Frequency</Label>
              <Select value={formData.meal_frequency} onValueChange={(v) => handleChange('meal_frequency', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 meal per day">1 meal per day</SelectItem>
                  <SelectItem value="2 meals per day">2 meals per day</SelectItem>
                  <SelectItem value="3 meals per day">3 meals per day</SelectItem>
                  <SelectItem value="4+ meals per day">4+ meals per day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Average Sleep Duration (Hours)</Label>
              <Input type="number" step="0.5" value={formData.average_sleep_duration} onChange={(e) => handleChange('average_sleep_duration', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sleep Quality</Label>
              <Select value={formData.sleep_quality} onValueChange={(v) => handleChange('sleep_quality', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 md:col-span-2">
              <Label>Sleep Issues</Label>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox id="insomnia" checked={formData.insomnia} onCheckedChange={(c) => handleChange('insomnia', c)} />
                  <Label htmlFor="insomnia" className="font-normal cursor-pointer">Insomnia</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="snoring" checked={formData.snoring} onCheckedChange={(c) => handleChange('snoring', c)} />
                  <Label htmlFor="snoring" className="font-normal cursor-pointer">Snoring</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="sleep_apnea" checked={formData.sleep_apnea} onCheckedChange={(c) => handleChange('sleep_apnea', c)} />
                  <Label htmlFor="sleep_apnea" className="font-normal cursor-pointer">Sleep Apnea</Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground">Sexual & Reproductive Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <div className="space-y-2">
              <Label>Sexually Active?</Label>
              <Select value={formData.sexually_active} onValueChange={(v) => handleChange('sexually_active', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Protection Use</Label>
              <Select value={formData.protection_use} onValueChange={(v) => handleChange('protection_use', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Always">Always</SelectItem>
                  <SelectItem value="Sometimes">Sometimes</SelectItem>
                  <SelectItem value="Never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Family Planning Usage</Label>
              <Input placeholder="Contraceptives, fertility planning..." value={formData.family_planning} onChange={(e) => handleChange('family_planning', e.target.value)} />
            </div>
            <div className="space-y-3 pt-8">
              <div className="flex items-center space-x-2">
                <Checkbox id="sti_history" checked={formData.sti_history} onCheckedChange={(c) => handleChange('sti_history', c)} />
                <Label htmlFor="sti_history" className="font-normal cursor-pointer">History of STI(s)</Label>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground">Daily Wellness</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <div className="space-y-4 md:col-span-2">
              <div className="flex justify-between items-center">
                <Label>Stress Level</Label>
                <span className="text-sm font-medium">{formData.stress_level} / 10</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={formData.stress_level} 
                onChange={(e) => handleChange('stress_level', parseInt(e.target.value))} 
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low Stress</span>
                <span>High Stress</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Water Intake (Liters/day)</Label>
              <Input type="number" step="0.5" value={formData.water_intake} onChange={(e) => handleChange('water_intake', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Screen Time (Hours/day)</Label>
              <Input type="number" step="0.5" value={formData.screen_time} onChange={(e) => handleChange('screen_time', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Work Type</Label>
              <Select value={formData.work_type} onValueChange={(v) => handleChange('work_type', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sedentary">Sedentary (Desk job)</SelectItem>
                  <SelectItem value="Light">Light physical</SelectItem>
                  <SelectItem value="Moderate">Moderate physical</SelectItem>
                  <SelectItem value="Heavy">Heavy labor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sedentary Hours (per day)</Label>
              <Input type="number" value={formData.sedentary_hours} onChange={(e) => handleChange('sedentary_hours', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-border">
        <Button type="button" variant="outline" onClick={onBack} size="lg" disabled={isSubmitting}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button type="submit" size="lg" className="px-8" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Next Step'} {!isSubmitting && <ChevronRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}