import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Step2_HealthInformation({ initialData, onNext, onBack }) {
  const [formData, setFormData] = useState({
    sex_assigned_at_birth: initialData?.sex_assigned_at_birth || '',
    gender_identity: initialData?.gender_identity || '',
    blood_group: initialData?.blood_group || '',
    height: initialData?.height || '',
    weight: initialData?.weight || '',
    marital_status: initialData?.marital_status || '',
  });

  const [bmi, setBmi] = useState(initialData?.bmi || '');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (formData.height && formData.weight) {
      const heightInMeters = parseFloat(formData.height) / 100;
      const weightInKg = parseFloat(formData.weight);
      if (heightInMeters > 0 && weightInKg > 0) {
        const calculatedBmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
        setBmi(calculatedBmi);
      } else {
        setBmi('');
      }
    } else {
      setBmi('');
    }
  }, [formData.height, formData.weight]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.sex_assigned_at_birth) newErrors.sex_assigned_at_birth = 'Required';
    if (!formData.gender_identity) newErrors.gender_identity = 'Required';
    if (!formData.blood_group) newErrors.blood_group = 'Required';
    if (!formData.height || isNaN(formData.height)) newErrors.height = 'Valid height required';
    if (!formData.weight || isNaN(formData.weight)) newErrors.weight = 'Valid weight required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext({ ...formData, bmi });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Basic Health Metrics</h3>
          <p className="text-sm text-muted-foreground">This helps establish your baseline health profile.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Sex Assigned at Birth *</Label>
            <Select value={formData.sex_assigned_at_birth} onValueChange={(v) => handleChange('sex_assigned_at_birth', v)}>
              <SelectTrigger className={errors.sex_assigned_at_birth ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select Sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="intersex">Intersex</SelectItem>
              </SelectContent>
            </Select>
            {errors.sex_assigned_at_birth && <p className="text-xs text-destructive">{errors.sex_assigned_at_birth}</p>}
          </div>

          <div className="space-y-2">
            <Label>Gender Identity *</Label>
            <Select value={formData.gender_identity} onValueChange={(v) => handleChange('gender_identity', v)}>
              <SelectTrigger className={errors.gender_identity ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select Gender Identity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non_binary">Non-binary</SelectItem>
                <SelectItem value="prefer_to_self_describe">Prefer to self-describe</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender_identity && <p className="text-xs text-destructive">{errors.gender_identity}</p>}
          </div>

          <div className="space-y-2">
            <Label>Blood Group *</Label>
            <Select value={formData.blood_group} onValueChange={(v) => handleChange('blood_group', v)}>
              <SelectTrigger className={errors.blood_group ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select Blood Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="O+">O+</SelectItem>
                <SelectItem value="O-">O-</SelectItem>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B-">B-</SelectItem>
                <SelectItem value="AB+">AB+</SelectItem>
                <SelectItem value="AB-">AB-</SelectItem>
              </SelectContent>
            </Select>
            {errors.blood_group && <p className="text-xs text-destructive">{errors.blood_group}</p>}
          </div>

          <div className="space-y-2">
            <Label>Marital Status</Label>
            <Select value={formData.marital_status} onValueChange={(v) => handleChange('marital_status', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="divorced">Divorced</SelectItem>
                <SelectItem value="widowed">Widowed</SelectItem>
                <SelectItem value="domestic_partnership">Domestic Partnership</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
          <div className="space-y-2">
            <Label htmlFor="height">Height (cm) *</Label>
            <Input id="height" type="number" placeholder="e.g., 175" value={formData.height} onChange={(e) => handleChange('height', e.target.value)} className={errors.height ? 'border-destructive' : ''} />
            {errors.height && <p className="text-xs text-destructive">{errors.height}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg) *</Label>
            <Input id="weight" type="number" placeholder="e.g., 70" value={formData.weight} onChange={(e) => handleChange('weight', e.target.value)} className={errors.weight ? 'border-destructive' : ''} />
            {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
          </div>

          <div className="space-y-2">
            <Label>Calculated BMI</Label>
            <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background items-center font-medium">
              {bmi || '-'}
            </div>
            {bmi && (
              <p className="text-xs text-muted-foreground mt-1">
                {bmi < 18.5 && "Underweight"}
                {bmi >= 18.5 && bmi < 25 && "Normal weight"}
                {bmi >= 25 && bmi < 30 && "Overweight"}
                {bmi >= 30 && "Obese"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-border">
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