import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';

export default function Step13_EmergencyContacts({ initialData, onNext, onBack, isSubmitting }) {
  const [formData, setFormData] = useState({
    // Primary
    p_first_name: initialData?.p_first_name || '',
    p_last_name: initialData?.p_last_name || '',
    p_relationship: initialData?.p_relationship || '',
    p_phone: initialData?.p_phone || '',
    p_alt_phone: initialData?.p_alt_phone || '',
    p_email: initialData?.p_email || '',
    p_address: initialData?.p_address || '',
    
    // Secondary
    s_first_name: initialData?.s_first_name || '',
    s_last_name: initialData?.s_last_name || '',
    s_relationship: initialData?.s_relationship || '',
    s_phone: initialData?.s_phone || '',
    s_availability: initialData?.s_availability || '',

    // Preferences
    contact_order: initialData?.contact_order || 'Primary First',
    can_discuss_medical_history: initialData?.can_discuss_medical_history || false,
    can_make_treatment_decisions: initialData?.can_make_treatment_decisions || false,
    has_access_to_records: initialData?.has_access_to_records || false,
    is_legal_guardian: initialData?.is_legal_guardian || false,
    is_healthcare_proxy: initialData?.is_healthcare_proxy || false,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.p_first_name) newErrors.p_first_name = 'Required';
    if (!formData.p_last_name) newErrors.p_last_name = 'Required';
    if (!formData.p_relationship) newErrors.p_relationship = 'Required';
    if (!formData.p_phone) newErrors.p_phone = 'Required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Primary Emergency Contact</h3>
          <p className="text-sm text-muted-foreground">The main person we should contact in case of an emergency.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>First Name *</Label>
            <Input value={formData.p_first_name} onChange={(e) => handleChange('p_first_name', e.target.value)} className={errors.p_first_name ? 'border-destructive' : ''} />
            {errors.p_first_name && <p className="text-xs text-destructive">{errors.p_first_name}</p>}
          </div>
          <div className="space-y-2">
            <Label>Last Name *</Label>
            <Input value={formData.p_last_name} onChange={(e) => handleChange('p_last_name', e.target.value)} className={errors.p_last_name ? 'border-destructive' : ''} />
            {errors.p_last_name && <p className="text-xs text-destructive">{errors.p_last_name}</p>}
          </div>
          <div className="space-y-2">
            <Label>Relationship *</Label>
            <Select value={formData.p_relationship} onValueChange={(v) => handleChange('p_relationship', v)}>
              <SelectTrigger className={errors.p_relationship ? 'border-destructive' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Parent">Parent</SelectItem>
                <SelectItem value="Spouse">Spouse</SelectItem>
                <SelectItem value="Sibling">Sibling</SelectItem>
                <SelectItem value="Friend">Friend</SelectItem>
                <SelectItem value="Guardian">Guardian</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.p_relationship && <p className="text-xs text-destructive">{errors.p_relationship}</p>}
          </div>
          <div className="space-y-2">
            <Label>Phone Number *</Label>
            <Input type="tel" value={formData.p_phone} onChange={(e) => handleChange('p_phone', e.target.value)} className={errors.p_phone ? 'border-destructive' : ''} />
            {errors.p_phone && <p className="text-xs text-destructive">{errors.p_phone}</p>}
          </div>
          <div className="space-y-2">
            <Label>Alternate Phone</Label>
            <Input type="tel" value={formData.p_alt_phone} onChange={(e) => handleChange('p_alt_phone', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={formData.p_email} onChange={(e) => handleChange('p_email', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input value={formData.p_address} onChange={(e) => handleChange('p_address', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Secondary Emergency Contact <span className="font-normal text-muted-foreground text-sm">(Optional)</span></h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input value={formData.s_first_name} onChange={(e) => handleChange('s_first_name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input value={formData.s_last_name} onChange={(e) => handleChange('s_last_name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Relationship</Label>
            <Select value={formData.s_relationship} onValueChange={(v) => handleChange('s_relationship', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Parent">Parent</SelectItem>
                <SelectItem value="Spouse">Spouse</SelectItem>
                <SelectItem value="Sibling">Sibling</SelectItem>
                <SelectItem value="Friend">Friend</SelectItem>
                <SelectItem value="Guardian">Guardian</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input type="tel" value={formData.s_phone} onChange={(e) => handleChange('s_phone', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Availability Notes</Label>
            <Input value={formData.s_availability} onChange={(e) => handleChange('s_availability', e.target.value)} placeholder="e.g. Call after 5PM" />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Emergency Preferences & Authorizations</h3>
        <div className="space-y-5 bg-muted/20 p-5 rounded-xl border border-border">
          <div className="space-y-2 max-w-sm">
            <Label>Preferred Contact Order</Label>
            <Select value={formData.contact_order} onValueChange={(v) => handleChange('contact_order', v)}>
              <SelectTrigger><SelectValue placeholder="Select Order" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Primary First">Primary First</SelectItem>
                <SelectItem value="Secondary First">Secondary First</SelectItem>
                <SelectItem value="Simultaneous">Simultaneous</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {[
              { id: 'can_discuss_medical_history', label: 'Can Discuss Medical History' },
              { id: 'can_make_treatment_decisions', label: 'Can Make Treatment Decisions' },
              { id: 'has_access_to_records', label: 'Has Access to Records' },
              { id: 'is_legal_guardian', label: 'Is Legal Guardian' },
              { id: 'is_healthcare_proxy', label: 'Is Healthcare Proxy' },
            ].map(item => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox id={item.id} checked={formData[item.id]} onCheckedChange={(c) => handleChange(item.id, c)} />
                <Label htmlFor={item.id} className="font-normal cursor-pointer">{item.label}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-border">
        <Button type="button" variant="outline" onClick={onBack} size="lg" disabled={isSubmitting}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button type="submit" size="lg" className="px-8 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
          {isSubmitting ? 'Finalizing...' : 'Complete Onboarding'} 
          {!isSubmitting && <CheckCircle2 className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}