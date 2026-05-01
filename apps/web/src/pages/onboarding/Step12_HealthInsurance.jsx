import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, UploadCloud } from 'lucide-react';

export default function Step12_HealthInsurance({ initialData, onNext, onBack, isSubmitting }) {
  const [formData, setFormData] = useState({
    insurance_type: initialData?.insurance_type || '',
    carrier_name: initialData?.carrier_name || '',
    member_id: initialData?.member_id || '',
    group_number: initialData?.group_number || '',
    policy_holder_name: initialData?.policy_holder_name || '',
    relationship_to_holder: initialData?.relationship_to_holder || '',
    effective_date: initialData?.effective_date || '',
    expiry_date: initialData?.expiry_date || '',
    plan_name: initialData?.plan_name || '',
    primary_insurance: initialData?.primary_insurance || false,
    secondary_insurance: initialData?.secondary_insurance || false,
    prescription_coverage: initialData?.prescription_coverage || false,
    dental_coverage: initialData?.dental_coverage || false,
    vision_coverage: initialData?.vision_coverage || false,
    specialist_coverage: initialData?.specialist_coverage || false,
    lab_coverage: initialData?.lab_coverage || false,
    emergency_coverage: initialData?.emergency_coverage || false,
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
    if (!formData.insurance_type) newErrors.insurance_type = 'Required';
    if (!formData.carrier_name) newErrors.carrier_name = 'Required';
    if (!formData.member_id) newErrors.member_id = 'Required';
    if (!formData.policy_holder_name) newErrors.policy_holder_name = 'Required';
    if (!formData.relationship_to_holder) newErrors.relationship_to_holder = 'Required';
    if (!formData.effective_date) newErrors.effective_date = 'Required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext(formData);
    }
  };

  const FileUploadBox = ({ label }) => (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer relative group">
      <UploadCloud className="h-8 w-8 text-muted-foreground mb-3 group-hover:text-primary transition-colors" />
      <span className="text-sm font-medium text-foreground text-center">{label}</span>
      <span className="text-xs text-muted-foreground mt-1 text-center">Max 20MB (JPG, PNG, PDF)</span>
      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,application/pdf" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Insurance Information</h3>
          <p className="text-sm text-muted-foreground">Provide details about your primary health insurance coverage.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>Insurance Type *</Label>
            <Select value={formData.insurance_type} onValueChange={(v) => handleChange('insurance_type', v)}>
              <SelectTrigger className={errors.insurance_type ? 'border-destructive' : ''}><SelectValue placeholder="Select Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Private">Private</SelectItem>
                <SelectItem value="Employer-Sponsored">Employer-Sponsored</SelectItem>
                <SelectItem value="Government">Government</SelectItem>
                <SelectItem value="Medicaid">Medicaid</SelectItem>
                <SelectItem value="Medicare">Medicare</SelectItem>
                <SelectItem value="HMO">HMO</SelectItem>
                <SelectItem value="PPO">PPO</SelectItem>
                <SelectItem value="EPO">EPO</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
                <SelectItem value="Self-pay">Self-pay</SelectItem>
              </SelectContent>
            </Select>
            {errors.insurance_type && <p className="text-xs text-destructive">{errors.insurance_type}</p>}
          </div>

          <div className="space-y-2">
            <Label>Insurer / Carrier *</Label>
            <Select value={formData.carrier_name} onValueChange={(v) => handleChange('carrier_name', v)}>
              <SelectTrigger className={errors.carrier_name ? 'border-destructive' : ''}><SelectValue placeholder="Select Carrier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Blue Cross Blue Shield">Blue Cross Blue Shield</SelectItem>
                <SelectItem value="Aetna">Aetna</SelectItem>
                <SelectItem value="Cigna">Cigna</SelectItem>
                <SelectItem value="UnitedHealthcare">UnitedHealthcare</SelectItem>
                <SelectItem value="Humana">Humana</SelectItem>
                <SelectItem value="Kaiser Permanente">Kaiser Permanente</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.carrier_name && <p className="text-xs text-destructive">{errors.carrier_name}</p>}
          </div>

          <div className="space-y-2">
            <Label>Member ID *</Label>
            <Input value={formData.member_id} onChange={(e) => handleChange('member_id', e.target.value)} className={errors.member_id ? 'border-destructive' : ''} />
            {errors.member_id && <p className="text-xs text-destructive">{errors.member_id}</p>}
          </div>

          <div className="space-y-2">
            <Label>Group Number</Label>
            <Input value={formData.group_number} onChange={(e) => handleChange('group_number', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Policy Holder Name *</Label>
            <Input value={formData.policy_holder_name} onChange={(e) => handleChange('policy_holder_name', e.target.value)} className={errors.policy_holder_name ? 'border-destructive' : ''} />
            {errors.policy_holder_name && <p className="text-xs text-destructive">{errors.policy_holder_name}</p>}
          </div>

          <div className="space-y-2">
            <Label>Relationship to Holder *</Label>
            <Select value={formData.relationship_to_holder} onValueChange={(v) => handleChange('relationship_to_holder', v)}>
              <SelectTrigger className={errors.relationship_to_holder ? 'border-destructive' : ''}><SelectValue placeholder="Select Relationship" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Self">Self</SelectItem>
                <SelectItem value="Spouse">Spouse</SelectItem>
                <SelectItem value="Child">Child</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.relationship_to_holder && <p className="text-xs text-destructive">{errors.relationship_to_holder}</p>}
          </div>

          <div className="space-y-2">
            <Label>Effective Date *</Label>
            <Input type="date" value={formData.effective_date} onChange={(e) => handleChange('effective_date', e.target.value)} className={errors.effective_date ? 'border-destructive' : ''} />
            {errors.effective_date && <p className="text-xs text-destructive">{errors.effective_date}</p>}
          </div>

          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <Input type="date" value={formData.expiry_date} onChange={(e) => handleChange('expiry_date', e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Plan Name</Label>
            <Input value={formData.plan_name} onChange={(e) => handleChange('plan_name', e.target.value)} placeholder="e.g. Silver Access PPO" />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Coverage Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-5 rounded-xl border border-border">
          {[
            { id: 'primary_insurance', label: 'Primary Insurance' },
            { id: 'secondary_insurance', label: 'Secondary Insurance' },
            { id: 'prescription_coverage', label: 'Prescription Coverage' },
            { id: 'dental_coverage', label: 'Dental Coverage' },
            { id: 'vision_coverage', label: 'Vision Coverage' },
            { id: 'specialist_coverage', label: 'Specialist Coverage' },
            { id: 'lab_coverage', label: 'Lab Coverage' },
            { id: 'emergency_coverage', label: 'Emergency Coverage' }
          ].map(item => (
            <div key={item.id} className="flex items-center space-x-2">
              <Checkbox id={item.id} checked={formData[item.id]} onCheckedChange={(c) => handleChange(item.id, c)} />
              <Label htmlFor={item.id} className="font-normal cursor-pointer">{item.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Insurance Documents <span className="font-normal text-sm text-muted-foreground">(Optional)</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FileUploadBox label="Front of Card" />
          <FileUploadBox label="Back of Card" />
          <FileUploadBox label="Policy / Preauth" />
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