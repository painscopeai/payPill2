import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

export default function Step11_HealthcareProviders({ initialData, onNext, onBack, isSubmitting }) {
  const [pcp, setPcp] = useState(initialData?.pcp || {
    provider_name: '', specialty: '', hospital_affiliation: '', npi_number: '',
    address: '', phone: '', email: '', telemedicine_available: false, distance: ''
  });
  
  const [specialists, setSpecialists] = useState(initialData?.specialists?.length > 0 ? initialData.specialists : []);
  const [alliedHealth, setAlliedHealth] = useState(initialData?.alliedHealth?.length > 0 ? initialData.alliedHealth : []);
  
  const [errors, setErrors] = useState({ pcp: {}, specialists: {}, alliedHealth: {} });

  const handlePcpChange = (field, value) => {
    setPcp({ ...pcp, [field]: value });
  };

  const addSpecialist = () => {
    setSpecialists([...specialists, { id: Date.now(), provider_name: '', specialty: '', hospital_affiliation: '', npi_number: '', address: '', phone: '', email: '', telemedicine_available: false, distance: '' }]);
  };

  const removeSpecialist = (idToRemove) => {
    setSpecialists(specialists.filter(s => s.id !== idToRemove));
  };

  const handleSpecialistChange = (id, field, value) => {
    setSpecialists(specialists.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addAlliedHealth = () => {
    setAlliedHealth([...alliedHealth, { id: Date.now(), provider_name: '', provider_type: '', address: '', phone: '', email: '', telemedicine_available: false }]);
  };

  const removeAlliedHealth = (idToRemove) => {
    setAlliedHealth(alliedHealth.filter(a => a.id !== idToRemove));
  };

  const handleAlliedHealthChange = (id, field, value) => {
    setAlliedHealth(alliedHealth.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const validate = () => {
    const newErrors = { pcp: {}, specialists: {}, alliedHealth: {} };
    let isValid = true;

    // Specialists validation
    specialists.forEach(spec => {
      const specErr = {};
      if (!spec.provider_name) specErr.provider_name = 'Required';
      if (!spec.specialty) specErr.specialty = 'Required';
      if (Object.keys(specErr).length > 0) {
        newErrors.specialists[spec.id] = specErr;
        isValid = false;
      }
    });

    // Allied Health validation
    alliedHealth.forEach(ah => {
      const ahErr = {};
      if (!ah.provider_name) ahErr.provider_name = 'Required';
      if (!ah.provider_type) ahErr.provider_type = 'Required';
      if (Object.keys(ahErr).length > 0) {
        newErrors.alliedHealth[ah.id] = ahErr;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext({ pcp, specialists, alliedHealth });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Primary Care Provider</h3>
          <p className="text-sm text-muted-foreground">Your main doctor or clinic.</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Provider Name</Label>
              <Input value={pcp.provider_name} onChange={(e) => handlePcpChange('provider_name', e.target.value)} placeholder="Dr. Name or Clinic" />
            </div>
            <div className="space-y-2">
              <Label>Specialty</Label>
              <Select value={pcp.specialty} onValueChange={(v) => handlePcpChange('specialty', v)}>
                <SelectTrigger><SelectValue placeholder="Select Specialty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Family Physician">Family Physician</SelectItem>
                  <SelectItem value="GP">General Practitioner (GP)</SelectItem>
                  <SelectItem value="Internist">Internist</SelectItem>
                  <SelectItem value="Pediatrician">Pediatrician</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hospital Affiliation</Label>
              <Input value={pcp.hospital_affiliation} onChange={(e) => handlePcpChange('hospital_affiliation', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>NPI / Registration Number</Label>
              <Input value={pcp.npi_number} onChange={(e) => handlePcpChange('npi_number', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Input value={pcp.address} onChange={(e) => handlePcpChange('address', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input type="tel" value={pcp.phone} onChange={(e) => handlePcpChange('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={pcp.email} onChange={(e) => handlePcpChange('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Distance from You (miles/km)</Label>
              <Input type="number" value={pcp.distance} onChange={(e) => handlePcpChange('distance', e.target.value)} />
            </div>
            <div className="space-y-3 pt-8">
              <div className="flex items-center space-x-2">
                <Checkbox id="pcp_tele" checked={pcp.telemedicine_available} onCheckedChange={(c) => handlePcpChange('telemedicine_available', c)} />
                <Label htmlFor="pcp_tele" className="font-normal cursor-pointer">Telemedicine Available</Label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Specialist Providers</h3>
            <p className="text-sm text-muted-foreground">Cardiologists, Oncologists, Neurologists, etc.</p>
          </div>
          <Button type="button" onClick={addSpecialist} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Add Specialist
          </Button>
        </div>

        {specialists.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border border-dashed text-center">No specialists added.</p>
        ) : (
          <div className="space-y-6">
            {specialists.map((spec, index) => (
              <div key={spec.id} className="relative bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="absolute top-4 right-4">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSpecialist(spec.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <h4 className="font-medium text-sm text-muted-foreground uppercase mb-4">Specialist {index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Provider Name *</Label>
                    <Input value={spec.provider_name} onChange={(e) => handleSpecialistChange(spec.id, 'provider_name', e.target.value)} className={errors.specialists[spec.id]?.provider_name ? 'border-destructive' : ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>Specialty *</Label>
                    <Select value={spec.specialty} onValueChange={(v) => handleSpecialistChange(spec.id, 'specialty', v)}>
                      <SelectTrigger className={errors.specialists[spec.id]?.specialty ? 'border-destructive' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nephrologist">Nephrologist</SelectItem>
                        <SelectItem value="Cardiologist">Cardiologist</SelectItem>
                        <SelectItem value="Endocrinologist">Endocrinologist</SelectItem>
                        <SelectItem value="Neurologist">Neurologist</SelectItem>
                        <SelectItem value="Pulmonologist">Pulmonologist</SelectItem>
                        <SelectItem value="Gastroenterologist">Gastroenterologist</SelectItem>
                        <SelectItem value="Oncologist">Oncologist</SelectItem>
                        <SelectItem value="Psychiatrist">Psychiatrist</SelectItem>
                        <SelectItem value="Dermatologist">Dermatologist</SelectItem>
                        <SelectItem value="Orthopedic">Orthopedic</SelectItem>
                        <SelectItem value="Gynecologist">Gynecologist</SelectItem>
                        <SelectItem value="Urologist">Urologist</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hospital</Label>
                    <Input value={spec.hospital_affiliation} onChange={(e) => handleSpecialistChange(spec.id, 'hospital_affiliation', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input type="tel" value={spec.phone} onChange={(e) => handleSpecialistChange(spec.id, 'phone', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 pt-6 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Allied Health Providers</h3>
            <p className="text-sm text-muted-foreground">Therapists, Dietitians, Pharmacists, etc.</p>
          </div>
          <Button type="button" onClick={addAlliedHealth} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Add Provider
          </Button>
        </div>

        {alliedHealth.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border border-dashed text-center">No allied health providers added.</p>
        ) : (
          <div className="space-y-6">
            {alliedHealth.map((ah, index) => (
              <div key={ah.id} className="relative bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="absolute top-4 right-4">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeAlliedHealth(ah.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <h4 className="font-medium text-sm text-muted-foreground uppercase mb-4">Provider {index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Provider Name *</Label>
                    <Input value={ah.provider_name} onChange={(e) => handleAlliedHealthChange(ah.id, 'provider_name', e.target.value)} className={errors.alliedHealth[ah.id]?.provider_name ? 'border-destructive' : ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>Provider Type *</Label>
                    <Select value={ah.provider_type} onValueChange={(v) => handleAlliedHealthChange(ah.id, 'provider_type', v)}>
                      <SelectTrigger className={errors.alliedHealth[ah.id]?.provider_type ? 'border-destructive' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                        <SelectItem value="Physiotherapist">Physiotherapist</SelectItem>
                        <SelectItem value="Dietitian">Dietitian</SelectItem>
                        <SelectItem value="Psychologist">Psychologist</SelectItem>
                        <SelectItem value="Occupational Therapist">Occupational Therapist</SelectItem>
                        <SelectItem value="Speech Therapist">Speech Therapist</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Phone</Label>
                    <Input type="tel" value={ah.phone} onChange={(e) => handleAlliedHealthChange(ah.id, 'phone', e.target.value)} />
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