import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

export default function Step4_CurrentMedications({ initialData, onNext, onBack }) {
  const [medications, setMedications] = useState(initialData?.medications?.length > 0 ? initialData.medications : []);
  const [errors, setErrors] = useState({});

  const addMedication = () => {
    setMedications([
      ...medications,
      {
        id: Date.now(),
        medication_name: '',
        dosage: '',
        strength: '',
        frequency: '',
        route: '',
        start_date: '',
        end_date: '',
        prescribing_provider: '',
        indication: '',
        side_effects: '',
        adherence_status: ''
      }
    ]);
  };

  const removeMedication = (idToRemove) => {
    setMedications(medications.filter(m => m.id !== idToRemove));
    const newErrors = { ...errors };
    delete newErrors[idToRemove];
    setErrors(newErrors);
  };

  const handleChange = (id, field, value) => {
    setMedications(medications.map(m => m.id === id ? { ...m, [field]: value } : m));
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

    medications.forEach(med => {
      const medErrors = {};
      if (!med.medication_name) medErrors.medication_name = 'Required';
      if (!med.start_date) medErrors.start_date = 'Required';
      if (!med.indication) medErrors.indication = 'Required';
      
      if (Object.keys(medErrors).length > 0) {
        newErrors[med.id] = medErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext({ medications });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Current Medications</h3>
            <p className="text-sm text-muted-foreground">List all medications, supplements, or vitamins you take.</p>
          </div>
          <Button type="button" onClick={addMedication} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Add Medication
          </Button>
        </div>

        {medications.length === 0 ? (
          <div className="bg-muted/30 border border-dashed rounded-xl p-10 text-center flex flex-col items-center">
            <p className="text-muted-foreground mb-4">No medications added. Leave empty if you are not taking any.</p>
            <Button type="button" onClick={addMedication} variant="secondary">Add Medication</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {medications.map((med, index) => (
              <div key={med.id} className="relative bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="absolute top-4 right-4">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeMedication(med.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-4">Medication {index + 1}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Medication Name *</Label>
                    <Input value={med.medication_name} onChange={(e) => handleChange(med.id, 'medication_name', e.target.value)} placeholder="e.g., Lisinopril" className={errors[med.id]?.medication_name ? 'border-destructive' : ''} />
                    {errors[med.id]?.medication_name && <p className="text-xs text-destructive">{errors[med.id].medication_name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Dosage</Label>
                    <Input value={med.dosage} onChange={(e) => handleChange(med.id, 'dosage', e.target.value)} placeholder="e.g., 1 tablet" />
                  </div>

                  <div className="space-y-2">
                    <Label>Strength</Label>
                    <Input value={med.strength} onChange={(e) => handleChange(med.id, 'strength', e.target.value)} placeholder="e.g., 10mg" />
                  </div>

                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={med.frequency} onValueChange={(v) => handleChange(med.id, 'frequency', v)}>
                      <SelectTrigger><SelectValue placeholder="Select Frequency" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Once daily">Once daily</SelectItem>
                        <SelectItem value="Twice daily">Twice daily</SelectItem>
                        <SelectItem value="Three times daily">Three times daily</SelectItem>
                        <SelectItem value="Four times daily">Four times daily</SelectItem>
                        <SelectItem value="As needed">As needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Route</Label>
                    <Select value={med.route} onValueChange={(v) => handleChange(med.id, 'route', v)}>
                      <SelectTrigger><SelectValue placeholder="Select Route" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oral">Oral</SelectItem>
                        <SelectItem value="iv">IV</SelectItem>
                        <SelectItem value="subcutaneous">Subcutaneous</SelectItem>
                        <SelectItem value="topical">Topical</SelectItem>
                        <SelectItem value="inhaled">Inhaled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input type="date" value={med.start_date} onChange={(e) => handleChange(med.id, 'start_date', e.target.value)} className={errors[med.id]?.start_date ? 'border-destructive' : ''} max={new Date().toISOString().split('T')[0]} />
                    {errors[med.id]?.start_date && <p className="text-xs text-destructive">{errors[med.id].start_date}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={med.end_date} onChange={(e) => handleChange(med.id, 'end_date', e.target.value)} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Indication (Why do you take it?) *</Label>
                    <Input value={med.indication} onChange={(e) => handleChange(med.id, 'indication', e.target.value)} className={errors[med.id]?.indication ? 'border-destructive' : ''} />
                    {errors[med.id]?.indication && <p className="text-xs text-destructive">{errors[med.id].indication}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Prescribing Provider</Label>
                    <Input value={med.prescribing_provider} onChange={(e) => handleChange(med.id, 'prescribing_provider', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Adherence Status</Label>
                    <Select value={med.adherence_status} onValueChange={(v) => handleChange(med.id, 'adherence_status', v)}>
                      <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Side Effects</Label>
                    <Textarea value={med.side_effects} onChange={(e) => handleChange(med.id, 'side_effects', e.target.value)} className="resize-none" />
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