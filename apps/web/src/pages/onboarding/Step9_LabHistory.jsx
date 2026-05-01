import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

export default function Step9_LabHistory({ initialData, onNext, onBack, isSubmitting }) {
  const [labs, setLabs] = useState(initialData?.labs?.length > 0 ? initialData.labs : []);
  const [errors, setErrors] = useState({});

  const addLab = () => {
    setLabs([
      ...labs,
      {
        id: Date.now(),
        test_name: '',
        date_performed: '',
        result_value: '',
        unit: '',
        reference_range: '',
        status: '',
        lab_name: '',
        additional_notes: ''
      }
    ]);
  };

  const removeLab = (idToRemove) => {
    setLabs(labs.filter(l => l.id !== idToRemove));
    const newErrors = { ...errors };
    delete newErrors[idToRemove];
    setErrors(newErrors);
  };

  const handleChange = (id, field, value) => {
    setLabs(labs.map(l => l.id === id ? { ...l, [field]: value } : l));
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

    labs.forEach(lab => {
      const labErrors = {};
      if (!lab.test_name) labErrors.test_name = 'Required';
      if (!lab.date_performed) labErrors.date_performed = 'Required';
      if (!lab.result_value) labErrors.result_value = 'Required';
      if (!lab.unit) labErrors.unit = 'Required';
      if (!lab.status) labErrors.status = 'Required';
      
      if (Object.keys(labErrors).length > 0) {
        newErrors[lab.id] = labErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext({ labs });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Recent Lab History</h3>
            <p className="text-sm text-muted-foreground">Log important recent lab results for a complete health picture.</p>
          </div>
          <Button type="button" onClick={addLab} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Add Lab Test
          </Button>
        </div>

        {labs.length === 0 ? (
          <div className="bg-muted/30 border border-dashed rounded-xl p-10 text-center flex flex-col items-center">
            <p className="text-muted-foreground mb-4">No lab results added.</p>
            <Button type="button" onClick={addLab} variant="secondary">Add Entry</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {labs.map((lab, index) => (
              <div key={lab.id} className="relative bg-card border border-border rounded-xl p-6 shadow-sm transition-all hover:shadow-md">
                <div className="absolute top-4 right-4">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLab(lab.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-4">Lab Test {index + 1}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Test Name *</Label>
                    <Select value={lab.test_name} onValueChange={(v) => handleChange(lab.id, 'test_name', v)}>
                      <SelectTrigger className={errors[lab.id]?.test_name ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select Test" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Blood Sugar">Blood Sugar</SelectItem>
                        <SelectItem value="HbA1c">HbA1c</SelectItem>
                        <SelectItem value="Creatinine">Creatinine</SelectItem>
                        <SelectItem value="eGFR">eGFR</SelectItem>
                        <SelectItem value="Lipid Profile">Lipid Profile</SelectItem>
                        <SelectItem value="Urinalysis">Urinalysis</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors[lab.id]?.test_name && <p className="text-xs text-destructive">{errors[lab.id].test_name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Date Performed *</Label>
                    <Input type="date" value={lab.date_performed} onChange={(e) => handleChange(lab.id, 'date_performed', e.target.value)} max={new Date().toISOString().split('T')[0]} className={errors[lab.id]?.date_performed ? 'border-destructive' : ''} />
                    {errors[lab.id]?.date_performed && <p className="text-xs text-destructive">{errors[lab.id].date_performed}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Result Value *</Label>
                    <Input value={lab.result_value} onChange={(e) => handleChange(lab.id, 'result_value', e.target.value)} className={errors[lab.id]?.result_value ? 'border-destructive' : ''} placeholder="e.g. 5.4" />
                    {errors[lab.id]?.result_value && <p className="text-xs text-destructive">{errors[lab.id].result_value}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Unit *</Label>
                    <Input value={lab.unit} onChange={(e) => handleChange(lab.id, 'unit', e.target.value)} className={errors[lab.id]?.unit ? 'border-destructive' : ''} placeholder="e.g. mg/dL, mmol/L" />
                    {errors[lab.id]?.unit && <p className="text-xs text-destructive">{errors[lab.id].unit}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Reference Range</Label>
                    <Input value={lab.reference_range} onChange={(e) => handleChange(lab.id, 'reference_range', e.target.value)} placeholder="e.g. 4.0 - 5.6" />
                  </div>

                  <div className="space-y-2">
                    <Label>Status *</Label>
                    <Select value={lab.status} onValueChange={(v) => handleChange(lab.id, 'status', v)}>
                      <SelectTrigger className={errors[lab.id]?.status ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Abnormal">Abnormal</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors[lab.id]?.status && <p className="text-xs text-destructive">{errors[lab.id].status}</p>}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Lab Name</Label>
                    <Input value={lab.lab_name} onChange={(e) => handleChange(lab.id, 'lab_name', e.target.value)} placeholder="e.g. Quest Diagnostics" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Additional Notes</Label>
                    <Textarea value={lab.additional_notes} onChange={(e) => handleChange(lab.id, 'additional_notes', e.target.value)} className="resize-none" />
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