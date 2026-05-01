import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { ChevronRight } from 'lucide-react';

export default function Step1_ProfileSetup({ initialData, onNext }) {
  const { currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || currentUser?.first_name || '',
    last_name: initialData?.last_name || currentUser?.last_name || '',
    date_of_birth: initialData?.date_of_birth || '',
    phone: initialData?.phone || currentUser?.phone || '',
    email: initialData?.email || currentUser?.email || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state_province: initialData?.state_province || '',
    zip_postal_code: initialData?.zip_postal_code || '',
    country: initialData?.country || 'United States',
    emergency_contact_name: initialData?.emergency_contact_name || '',
    emergency_contact_phone: initialData?.emergency_contact_phone || '',
    emergency_contact_relationship: initialData?.emergency_contact_relationship || '',
    preferred_language: initialData?.preferred_language || 'English',
    communication_preference: initialData?.communication_preference || 'Email',
    two_factor_enabled: initialData?.two_factor_enabled || false,
    data_sharing_consent: initialData?.data_sharing_consent || false,
    research_participation: initialData?.research_participation || false,
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
    const required = [
      'first_name', 'last_name', 'date_of_birth', 'phone', 'email', 
      'address', 'city', 'state_province', 'zip_postal_code', 'country',
      'emergency_contact_name', 'emergency_contact_phone'
    ];
    
    required.forEach(field => {
      if (!formData[field]) newErrors[field] = 'This field is required';
    });

    if (!formData.data_sharing_consent) {
      newErrors.data_sharing_consent = 'You must consent to data sharing to proceed.';
    }

    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

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
          <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
          <p className="text-sm text-muted-foreground">Please provide your basic contact details.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input id="first_name" value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} className={errors.first_name ? 'border-destructive' : ''} />
            {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input id="last_name" value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} className={errors.last_name ? 'border-destructive' : ''} />
            {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth *</Label>
            <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} className={errors.date_of_birth ? 'border-destructive' : ''} max={new Date().toISOString().split('T')[0]} />
            {errors.date_of_birth && <p className="text-xs text-destructive">{errors.date_of_birth}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className={errors.email ? 'border-destructive' : ''} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input id="phone" type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className={errors.phone ? 'border-destructive' : ''} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_language">Preferred Language</Label>
            <Select value={formData.preferred_language} onValueChange={(v) => handleChange('preferred_language', v)}>
              <SelectTrigger><SelectValue placeholder="Select Language" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Spanish">Spanish</SelectItem>
                <SelectItem value="French">French</SelectItem>
                <SelectItem value="Mandarin">Mandarin</SelectItem>
                <SelectItem value="Hindi">Hindi</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Address</h3>
          <p className="text-sm text-muted-foreground">Your current residential address.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Street Address *</Label>
            <Input id="address" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className={errors.address ? 'border-destructive' : ''} />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input id="city" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} className={errors.city ? 'border-destructive' : ''} />
            {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="state_province">State / Province *</Label>
            <Input id="state_province" value={formData.state_province} onChange={(e) => handleChange('state_province', e.target.value)} className={errors.state_province ? 'border-destructive' : ''} />
            {errors.state_province && <p className="text-xs text-destructive">{errors.state_province}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip_postal_code">Zip / Postal Code *</Label>
            <Input id="zip_postal_code" value={formData.zip_postal_code} onChange={(e) => handleChange('zip_postal_code', e.target.value)} className={errors.zip_postal_code ? 'border-destructive' : ''} />
            {errors.zip_postal_code && <p className="text-xs text-destructive">{errors.zip_postal_code}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Input id="country" value={formData.country} onChange={(e) => handleChange('country', e.target.value)} className={errors.country ? 'border-destructive' : ''} />
            {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Emergency Contact</h3>
          <p className="text-sm text-muted-foreground">Who should we contact in case of an emergency?</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Contact Name *</Label>
            <Input id="emergency_contact_name" value={formData.emergency_contact_name} onChange={(e) => handleChange('emergency_contact_name', e.target.value)} className={errors.emergency_contact_name ? 'border-destructive' : ''} />
            {errors.emergency_contact_name && <p className="text-xs text-destructive">{errors.emergency_contact_name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Contact Phone *</Label>
            <Input id="emergency_contact_phone" type="tel" value={formData.emergency_contact_phone} onChange={(e) => handleChange('emergency_contact_phone', e.target.value)} className={errors.emergency_contact_phone ? 'border-destructive' : ''} />
            {errors.emergency_contact_phone && <p className="text-xs text-destructive">{errors.emergency_contact_phone}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Relationship</Label>
            <Select value={formData.emergency_contact_relationship} onValueChange={(v) => handleChange('emergency_contact_relationship', v)}>
              <SelectTrigger><SelectValue placeholder="Select Relationship" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Spouse">Spouse</SelectItem>
                <SelectItem value="Parent">Parent</SelectItem>
                <SelectItem value="Sibling">Sibling</SelectItem>
                <SelectItem value="Friend">Friend</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Preferences & Security</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Communication Preference</Label>
            <Select value={formData.communication_preference} onValueChange={(v) => handleChange('communication_preference', v)}>
              <SelectTrigger><SelectValue placeholder="Select Preference" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="Push Notification">Push Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4 bg-muted/50 p-4 rounded-xl border border-border">
          <div className="flex items-center space-x-3">
            <Checkbox id="two_factor_enabled" checked={formData.two_factor_enabled} onCheckedChange={(c) => handleChange('two_factor_enabled', c)} />
            <Label htmlFor="two_factor_enabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Enable Two-Factor Authentication (Recommended)
            </Label>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox id="data_sharing_consent" checked={formData.data_sharing_consent} onCheckedChange={(c) => handleChange('data_sharing_consent', c)} className={errors.data_sharing_consent ? 'border-destructive' : ''} />
            <div className="space-y-1 leading-none">
              <Label htmlFor="data_sharing_consent" className="text-sm font-medium">Data Sharing Consent *</Label>
              <p className="text-sm text-muted-foreground text-balance">I consent to the secure sharing of my health data with my designated healthcare providers to ensure continuity of care.</p>
              {errors.data_sharing_consent && <p className="text-xs text-destructive">{errors.data_sharing_consent}</p>}
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox id="research_participation" checked={formData.research_participation} onCheckedChange={(c) => handleChange('research_participation', c)} />
            <div className="space-y-1 leading-none">
              <Label htmlFor="research_participation" className="text-sm font-medium">Research Participation (Optional)</Label>
              <p className="text-sm text-muted-foreground text-balance">I agree to allow my anonymized health data to be used for medical research and AI improvement.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" size="lg" className="px-8">
          Next Step <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}