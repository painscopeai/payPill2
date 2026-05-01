import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

export default function Step7_SurgicalHistory({ initialData, onNext, onBack, isSubmitting }) {
  const [surgeries, setSurgeries] = useState(initialData?.surgeries?.length > 0 ? initialData.surgeries : []);
  const [errors, setErrors] = useState({});

  const addSurgery = () => {
    setSurgeries([
      ...surgeries,
      {
        id: Date.now(),
        surgery_name: '',
        year: '',
        facility: '',
        surgeon_name: '',
        complications: '',
        notes: ''
      }
    ]);
  };

  const removeSurgery = (idToRemove) => {
    setSurgeries(surgeries.filter(s => s.id !== idToRemove));
    const newErrors = { ...errors };
    delete newErrors[idToRemove];
    setErrors(newErrors);
  };

  const handleChange = (id, field, value) => {
    setSurgeries(surgeries.map(s => s.id === id ? { ...s, [field]: value } : s));
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

    surgeries.forEach(surg => {
      const surgErrors = {};
      if (!surg.surgery_name) surgErrors.surgery_name = 'Required';
      if (!surg.year) surgErrors.year = 'Required';
      if (!surg.facility) surgErrors.facility = 'Required';
      
      if (Object.keys(surgErrors).length > 0) {
        newErrors[surg.id] = surgErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext({ surgeries });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Surgical History</h3>
            <p className="text-sm text-muted-foreground">List any past surgical procedures you have undergone.</p>
          </div>
          <Button type="button" onClick={addSurgery} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Add Surgery
          </Button>
        </div>

        {surgeries.length === 0 ? (
          <div className="bg-muted/30 border border-dashed rounded-xl p-10 text-center flex flex-col items-center">
            <p className="text-muted-foreground mb-4">No surgical history added.</p>
            <Button type="button" onClick={addSurgery} variant="secondary">Add Entry</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {surgeries.map((surg, index) => (
              <div key={surg.id} className="relative bg-card border border-border rounded-xl p-6 shadow-sm transition-all hover:shadow-md">
                <div className="absolute top-4 right-4">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSurgery(surg.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-4">Surgery {index + 1}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Surgery Name / Procedure *</Label>
                    <Input value={surg.surgery_name} onChange={(e) => handleChange(surg.id, 'surgery_name', e.target.value)} className={errors[surg.id]?.surgery_name ? 'border-destructive' : ''} placeholder="e.g., Appendectomy" />
                    {errors[surg.id]?.surgery_name && <p className="text-xs text-destructive">{errors[surg.id].surgery_name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Input type="number" min="1900" max={new Date().getFullYear()} value={surg.year} onChange={(e) => handleChange(surg.id, 'year', e.target.value)} className={errors[surg.id]?.year ? 'border-destructive' : ''} placeholder="YYYY" />
                    {errors[surg.id]?.year && <p className="text-xs text-destructive">{errors[surg.id].year}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Facility / Hospital *</Label>
                    <Input value={surg.facility} onChange={(e) => handleChange(surg.id, 'facility', e.target.value)} className={errors[surg.id]?.facility ? 'border-destructive' : ''} placeholder="Hospital Name" />
                    {errors[surg.id]?.facility && <p className="text-xs text-destructive">{errors[surg.id].facility}</p>}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Surgeon Name</Label>
                    <Input value={surg.surgeon_name} onChange={(e) => handleChange(surg.id, 'surgeon_name', e.target.value)} placeholder="Dr. Name" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Complications (if any)</Label>
                    <Textarea value={surg.complications} onChange={(e) => handleChange(surg.id, 'complications', e.target.value)} className="resize-none" placeholder="Describe any post-surgery complications" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Additional Notes</Label>
                    <Textarea value={surg.notes} onChange={(e) => handleChange(surg.id, 'notes', e.target.value)} className="resize-none" />
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