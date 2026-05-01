import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

export default function Step6_FamilyMedicalHistory({ initialData, onNext, onBack, isSubmitting }) {
  const [history, setHistory] = useState(initialData?.history?.length > 0 ? initialData.history : []);
  const [errors, setErrors] = useState({});

  const addMember = () => {
    setHistory([
      ...history,
      {
        id: Date.now(),
        relation: '',
        condition: '',
        custom_condition: '',
        age_of_onset: '',
        notes: ''
      }
    ]);
  };

  const removeMember = (idToRemove) => {
    setHistory(history.filter(h => h.id !== idToRemove));
    const newErrors = { ...errors };
    delete newErrors[idToRemove];
    setErrors(newErrors);
  };

  const handleChange = (id, field, value) => {
    setHistory(history.map(h => h.id === id ? { ...h, [field]: value } : h));
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

    history.forEach(item => {
      const itemErrors = {};
      if (!item.relation) itemErrors.relation = 'Required';
      if (!item.condition) itemErrors.condition = 'Required';
      if (item.condition === 'Other' && !item.custom_condition) itemErrors.custom_condition = 'Required';
      
      if (Object.keys(itemErrors).length > 0) {
        newErrors[item.id] = itemErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext({ history });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Family Medical History</h3>
            <p className="text-sm text-muted-foreground">List significant medical conditions in your immediate family.</p>
          </div>
          <Button type="button" onClick={addMember} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Add Family Member
          </Button>
        </div>

        {history.length === 0 ? (
          <div className="bg-muted/30 border border-dashed rounded-xl p-10 text-center flex flex-col items-center">
            <p className="text-muted-foreground mb-4">No family medical history added.</p>
            <Button type="button" onClick={addMember} variant="secondary">Add Entry</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((item, index) => (
              <div key={item.id} className="relative bg-card border border-border rounded-xl p-6 shadow-sm transition-all hover:shadow-md">
                <div className="absolute top-4 right-4">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeMember(item.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-4">Entry {index + 1}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Relation *</Label>
                    <Select value={item.relation} onValueChange={(v) => handleChange(item.id, 'relation', v)}>
                      <SelectTrigger className={errors[item.id]?.relation ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select Relation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="Sibling">Sibling</SelectItem>
                        <SelectItem value="Grandparent">Grandparent</SelectItem>
                        <SelectItem value="Aunt/Uncle">Aunt/Uncle</SelectItem>
                        <SelectItem value="Cousin">Cousin</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors[item.id]?.relation && <p className="text-xs text-destructive">{errors[item.id].relation}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Condition *</Label>
                    <Select value={item.condition} onValueChange={(v) => handleChange(item.id, 'condition', v)}>
                      <SelectTrigger className={errors[item.id]?.condition ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diabetes">Diabetes</SelectItem>
                        <SelectItem value="Hypertension">Hypertension</SelectItem>
                        <SelectItem value="Cancer">Cancer</SelectItem>
                        <SelectItem value="Kidney Disease">Kidney Disease</SelectItem>
                        <SelectItem value="Heart Disease">Heart Disease</SelectItem>
                        <SelectItem value="Stroke">Stroke</SelectItem>
                        <SelectItem value="Sickle Cell Disease">Sickle Cell Disease</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors[item.id]?.condition && <p className="text-xs text-destructive">{errors[item.id].condition}</p>}
                  </div>

                  {item.condition === 'Other' && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Specify Condition *</Label>
                      <Input value={item.custom_condition} onChange={(e) => handleChange(item.id, 'custom_condition', e.target.value)} className={errors[item.id]?.custom_condition ? 'border-destructive' : ''} placeholder="Please specify the condition" />
                      {errors[item.id]?.custom_condition && <p className="text-xs text-destructive">{errors[item.id].custom_condition}</p>}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Age of Diagnosis (approx)</Label>
                    <Input type="number" value={item.age_of_onset} onChange={(e) => handleChange(item.id, 'age_of_onset', e.target.value)} placeholder="e.g. 45" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Additional Notes</Label>
                    <Textarea value={item.notes} onChange={(e) => handleChange(item.id, 'notes', e.target.value)} className="resize-none" placeholder="Any details like cancer type, outcome, etc." />
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