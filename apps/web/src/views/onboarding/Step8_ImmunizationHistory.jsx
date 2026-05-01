import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

export default function Step8_ImmunizationHistory({ initialData, onNext, onBack, isSubmitting }) {
  const [vaccines, setVaccines] = useState(initialData?.vaccines?.length > 0 ? initialData.vaccines : []);
  const [errors, setErrors] = useState({});

  const addVaccine = () => {
    setVaccines([
      ...vaccines,
      {
        id: Date.now(),
        vaccine_name: '',
        date_administered: '',
        dose_number: '',
        healthcare_provider: '',
        location: '',
        additional_notes: ''
      }
    ]);
  };

  const removeVaccine = (idToRemove) => {
    setVaccines(vaccines.filter(v => v.id !== idToRemove));
    const newErrors = { ...errors };
    delete newErrors[idToRemove];
    setErrors(newErrors);
  };

  const handleChange = (id, field, value) => {
    setVaccines(vaccines.map(v => v.id === id ? { ...v, [field]: value } : v));
    if (errors[id] && errors[id][field]) {
      setErrors({
        ...errors,
        [id]: { ...errors[id], [field]: null }
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    let isValid = true;

    vaccines.forEach(vac => {
      const vacErrors = {};
      if (!vac.vaccine_name) vacErrors.vaccine_name = 'Required';
      if (!vac.date_administered) vacErrors.date_administered = 'Required';
      
      if (Object.keys(vacErrors).length > 0) {
        newErrors[vac.id] = vacErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext({ vaccines });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Immunization History</h3>
            <p className="text-sm text-muted-foreground">List your significant vaccinations and immunizations.</p>
          </div>
          <Button type="button" onClick={addVaccine} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Add Vaccine
          </Button>
        </div>

        {vaccines.length === 0 ? (
          <div className="bg-muted/30 border border-dashed rounded-xl p-10 text-center flex flex-col items-center">
            <p className="text-muted-foreground mb-4">No immunizations added.</p>
            <Button type="button" onClick={addVaccine} variant="secondary">Add Entry</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {vaccines.map((vac, index) => (
              <div key={vac.id} className="relative bg-card border border-border rounded-xl p-6 shadow-sm transition-all hover:shadow-md">
                <div className="absolute top-4 right-4">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeVaccine(vac.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-4">Vaccine {index + 1}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Vaccine Name *</Label>
                    <Select value={vac.vaccine_name} onValueChange={(v) => handleChange(vac.id, 'vaccine_name', v)}>
                      <SelectTrigger className={errors[vac.id]?.vaccine_name ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select Vaccine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COVID-19">COVID-19</SelectItem>
                        <SelectItem value="Tetanus">Tetanus</SelectItem>
                        <SelectItem value="Hepatitis B">Hepatitis B</SelectItem>
                        <SelectItem value="Influenza">Influenza</SelectItem>
                        <SelectItem value="Childhood Vaccines">Childhood Vaccines</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors[vac.id]?.vaccine_name && <p className="text-xs text-destructive">{errors[vac.id].vaccine_name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Date Administered *</Label>
                    <Input type="date" value={vac.date_administered} onChange={(e) => handleChange(vac.id, 'date_administered', e.target.value)} max={new Date().toISOString().split('T')[0]} className={errors[vac.id]?.date_administered ? 'border-destructive' : ''} />
                    {errors[vac.id]?.date_administered && <p className="text-xs text-destructive">{errors[vac.id].date_administered}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Dose Number</Label>
                    <Input type="number" min="1" value={vac.dose_number} onChange={(e) => handleChange(vac.id, 'dose_number', e.target.value)} placeholder="e.g. 1" />
                  </div>

                  <div className="space-y-2">
                    <Label>Healthcare Provider</Label>
                    <Input value={vac.healthcare_provider} onChange={(e) => handleChange(vac.id, 'healthcare_provider', e.target.value)} placeholder="Clinic / Doctor name" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Location</Label>
                    <Input value={vac.location} onChange={(e) => handleChange(vac.id, 'location', e.target.value)} placeholder="City, State, or Facility" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Additional Notes</Label>
                    <Textarea value={vac.additional_notes} onChange={(e) => handleChange(vac.id, 'additional_notes', e.target.value)} className="resize-none" placeholder="Batch number, side effects, etc." />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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