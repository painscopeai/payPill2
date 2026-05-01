import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

export default function Step3_PreExistingConditions({ initialData, onNext, onBack }) {
  const [conditions, setConditions] = useState(initialData?.conditions?.length > 0 ? initialData.conditions : []);
  const [errors, setErrors] = useState({});

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: Date.now(),
        condition_category: '',
        condition_name: '',
        date_diagnosed: '',
        severity: '',
        current_treatment: '',
        controlled_status: '',
        managing_doctor: '',
        additional_notes: ''
      }
    ]);
  };

  const removeCondition = (idToRemove) => {
    setConditions(conditions.filter(c => c.id !== idToRemove));
    const newErrors = { ...errors };
    delete newErrors[idToRemove];
    setErrors(newErrors);
  };

  const handleChange = (id, field, value) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, [field]: value } : c));
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

    conditions.forEach(cond => {
      const condErrors = {};
      if (!cond.condition_name) condErrors.condition_name = 'Required';
      if (!cond.condition_category) condErrors.condition_category = 'Required';
      
      if (Object.keys(condErrors).length > 0) {
        newErrors[cond.id] = condErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext({ conditions });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Medical Conditions</h3>
            <p className="text-sm text-muted-foreground">List any pre-existing medical conditions.</p>
          </div>
          <Button type="button" onClick={addCondition} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Add Condition
          </Button>
        </div>

        {conditions.length === 0 ? (
          <div className="bg-muted/30 border border-dashed rounded-xl p-10 text-center flex flex-col items-center">
            <p className="text-muted-foreground mb-4">No medical conditions added yet.</p>
            <Button type="button" onClick={addCondition} variant="secondary">Add Your First Condition</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {conditions.map((cond, index) => (
              <div key={cond.id} className="relative bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="absolute top-4 right-4">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCondition(cond.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-4">Condition {index + 1}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Condition Category *</Label>
                    <Select value={cond.condition_category} onValueChange={(v) => handleChange(cond.id, 'condition_category', v)}>
                      <SelectTrigger className={errors[cond.id]?.condition_category ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                        <SelectItem value="endocrine">Endocrine</SelectItem>
                        <SelectItem value="kidney">Kidney</SelectItem>
                        <SelectItem value="respiratory">Respiratory</SelectItem>
                        <SelectItem value="neurological">Neurological</SelectItem>
                        <SelectItem value="mental_health">Mental Health</SelectItem>
                        <SelectItem value="gastrointestinal">Gastrointestinal</SelectItem>
                        <SelectItem value="musculoskeletal">Musculoskeletal</SelectItem>
                        <SelectItem value="cancer">Cancer</SelectItem>
                        <SelectItem value="infectious_disease">Infectious Disease</SelectItem>
                        <SelectItem value="autoimmune">Autoimmune</SelectItem>
                        <SelectItem value="womens_health">Women's Health</SelectItem>
                        <SelectItem value="mens_health">Men's Health</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors[cond.id]?.condition_category && <p className="text-xs text-destructive">{errors[cond.id].condition_category}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Condition Name *</Label>
                    <Input value={cond.condition_name} onChange={(e) => handleChange(cond.id, 'condition_name', e.target.value)} placeholder="e.g., Type 2 Diabetes" className={errors[cond.id]?.condition_name ? 'border-destructive' : ''} />
                    {errors[cond.id]?.condition_name && <p className="text-xs text-destructive">{errors[cond.id].condition_name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Date Diagnosed</Label>
                    <Input type="date" value={cond.date_diagnosed} onChange={(e) => handleChange(cond.id, 'date_diagnosed', e.target.value)} max={new Date().toISOString().split('T')[0]} />
                  </div>

                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={cond.severity} onValueChange={(v) => handleChange(cond.id, 'severity', v)}>
                      <SelectTrigger><SelectValue placeholder="Select Severity" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Current Treatment</Label>
                    <Input value={cond.current_treatment} onChange={(e) => handleChange(cond.id, 'current_treatment', e.target.value)} placeholder="e.g., Metformin and diet control" />
                  </div>

                  <div className="space-y-2">
                    <Label>Controlled Status</Label>
                    <Select value={cond.controlled_status} onValueChange={(v) => handleChange(cond.id, 'controlled_status', v)}>
                      <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="controlled">Controlled</SelectItem>
                        <SelectItem value="uncontrolled">Uncontrolled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Managing Doctor</Label>
                    <Input value={cond.managing_doctor} onChange={(e) => handleChange(cond.id, 'managing_doctor', e.target.value)} placeholder="Dr. Name" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Additional Notes</Label>
                    <Textarea value={cond.additional_notes} onChange={(e) => handleChange(cond.id, 'additional_notes', e.target.value)} className="resize-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6 border-t border-border">
        <Button type="button" variant="outline" onClick={onBack} size="lg">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button type="submit" size="lg" className="px-8">
          Next Step <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}