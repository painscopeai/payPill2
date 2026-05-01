import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react';

export default function Step5_Allergies({ initialData, onNext, onBack, isSubmitting }) {
  const [allergies, setAllergies] = useState(initialData?.allergies?.length > 0 ? initialData.allergies : []);
  const [errors, setErrors] = useState({});

  const addAllergy = () => {
    setAllergies([
      ...allergies,
      {
        id: Date.now(),
        allergy_type: '',
        allergen_name: '',
        reaction_type: '',
        severity: '',
        date_discovered: ''
      }
    ]);
  };

  const removeAllergy = (idToRemove) => {
    setAllergies(allergies.filter(a => a.id !== idToRemove));
    const newErrors = { ...errors };
    delete newErrors[idToRemove];
    setErrors(newErrors);
  };

  const handleChange = (id, field, value) => {
    setAllergies(allergies.map(a => a.id === id ? { ...a, [field]: value } : a));
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

    allergies.forEach(alg => {
      const algErrors = {};
      if (!alg.allergy_type) algErrors.allergy_type = 'Required';
      if (!alg.allergen_name) algErrors.allergen_name = 'Required';
      if (!alg.reaction_type) algErrors.reaction_type = 'Required';
      if (!alg.severity) algErrors.severity = 'Required';
      
      if (Object.keys(algErrors).length > 0) {
        newErrors[alg.id] = algErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext({ allergies });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Allergies</h3>
            <p className="text-sm text-muted-foreground">List any drug, food, or environmental allergies.</p>
          </div>
          <Button type="button" onClick={addAllergy} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Add Allergy
          </Button>
        </div>

        {allergies.length === 0 ? (
          <div className="bg-muted/30 border border-dashed rounded-xl p-10 text-center flex flex-col items-center">
            <p className="text-muted-foreground mb-4">No allergies added. Leave empty if you have no known allergies.</p>
            <Button type="button" onClick={addAllergy} variant="secondary">Add Allergy</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {allergies.map((alg, index) => (
              <div key={alg.id} className="relative bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="absolute top-4 right-4">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeAllergy(alg.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-4">Allergy {index + 1}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Allergy Type *</Label>
                    <Select value={alg.allergy_type} onValueChange={(v) => handleChange(alg.id, 'allergy_type', v)}>
                      <SelectTrigger className={errors[alg.id]?.allergy_type ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Drug">Drug</SelectItem>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Environmental">Environmental</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors[alg.id]?.allergy_type && <p className="text-xs text-destructive">{errors[alg.id].allergy_type}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Allergen Name *</Label>
                    <Input value={alg.allergen_name} onChange={(e) => handleChange(alg.id, 'allergen_name', e.target.value)} placeholder="e.g., Penicillin, Peanuts" className={errors[alg.id]?.allergen_name ? 'border-destructive' : ''} />
                    {errors[alg.id]?.allergen_name && <p className="text-xs text-destructive">{errors[alg.id].allergen_name}</p>}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Reaction Type *</Label>
                    <Input value={alg.reaction_type} onChange={(e) => handleChange(alg.id, 'reaction_type', e.target.value)} placeholder="e.g., Hives, Anaphylaxis" className={errors[alg.id]?.reaction_type ? 'border-destructive' : ''} />
                    {errors[alg.id]?.reaction_type && <p className="text-xs text-destructive">{errors[alg.id].reaction_type}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Severity *</Label>
                    <Select value={alg.severity} onValueChange={(v) => handleChange(alg.id, 'severity', v)}>
                      <SelectTrigger className={errors[alg.id]?.severity ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mild">Mild</SelectItem>
                        <SelectItem value="Moderate">Moderate</SelectItem>
                        <SelectItem value="Severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors[alg.id]?.severity && <p className="text-xs text-destructive">{errors[alg.id].severity}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Date Discovered</Label>
                    <Input type="date" value={alg.date_discovered} onChange={(e) => handleChange(alg.id, 'date_discovered', e.target.value)} max={new Date().toISOString().split('T')[0]} />
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
        <Button type="submit" size="lg" className="px-8 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
          {isSubmitting ? 'Saving Profile...' : 'Complete Profile'} 
          {!isSubmitting && <CheckCircle2 className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}