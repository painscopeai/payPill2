import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Building2, Users, Shield, UploadCloud, CheckCircle2, ChevronRight, ChevronLeft, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmployerOnboardingPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', industry: '', company_size: '', website: '', tax_id: '',
    address: '', city: '', state: '', zip: '', country: 'US', phone: '',
    hr_contact_name: '', hr_contact_email: '', hr_contact_phone: '', hr_contact_title: '',
    secondary_contact_name: '', secondary_contact_email: '', secondary_contact_phone: '',
    current_insurance_provider: '', insurance_plan_type: '', covered_employees: '',
    annual_premium_budget: '', coverage_start_date: '',
    terms_accepted: false, privacy_accepted: false, dpa_accepted: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (step < 5) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    if (!formData.terms_accepted || !formData.privacy_accepted || !formData.dpa_accepted) {
      toast.error('You must accept all agreements to continue.');
      return;
    }
    setIsSubmitting(true);
    try {
      await pb.collection('employers').create({
        ...formData,
        user_id: currentUser.id,
        status: 'active',
        acceptance_timestamp: new Date().toISOString(),
        covered_employees: parseInt(formData.covered_employees) || 0,
        annual_premium_budget: parseFloat(formData.annual_premium_budget) || 0
      }, { $autoCancel: false });
      
      toast.success('Onboarding complete!');
      navigate('/employer/dashboard');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error(error.message || 'Failed to save employer profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'Company Details', icon: Building2 },
    { id: 2, title: 'HR Contacts', icon: Users },
    { id: 3, title: 'Insurance', icon: Shield },
    { id: 4, title: 'Employees', icon: UploadCloud },
    { id: 5, title: 'Agreements', icon: CheckCircle2 }
  ];

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Employer Onboarding - PayPill</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome to PayPill for Employers</h1>
          <p className="text-muted-foreground mt-2">Let's set up your company profile in a few quick steps.</p>
        </div>

        {/* Progress Tracker */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className={`flex flex-col items-center ${step >= s.id ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 mb-2 transition-colors ${
                    step >= s.id ? 'border-primary bg-primary/10' : 'border-muted bg-background'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{s.title}</span>
                </div>
              );
            })}
          </div>
          <Progress value={(step / 5) * 100} className="h-2" />
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>{steps[step-1].title}</CardTitle>
            <CardDescription>Step {step} of 5</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Company Name *</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Acme Corp" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax_id">Tax ID (EIN) *</Label>
                      <Input id="tax_id" name="tax_id" value={formData.tax_id} onChange={handleChange} placeholder="XX-XXXXXXX" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select value={formData.industry} onValueChange={(val) => handleSelectChange('industry', val)}>
                        <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_size">Company Size</Label>
                      <Select value={formData.company_size} onValueChange={(val) => handleSelectChange('company_size', val)}>
                        <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-50">1 - 50</SelectItem>
                          <SelectItem value="51-200">51 - 200</SelectItem>
                          <SelectItem value="201-500">201 - 500</SelectItem>
                          <SelectItem value="501+">501+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="123 Business Pkwy" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Province</Label>
                      <Input id="state" name="state" value={formData.state} onChange={handleChange} placeholder="State" />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Primary HR Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="hr_contact_name">Full Name *</Label>
                          <Input id="hr_contact_name" name="hr_contact_name" value={formData.hr_contact_name} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hr_contact_title">Job Title</Label>
                          <Input id="hr_contact_title" name="hr_contact_title" value={formData.hr_contact_title} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hr_contact_email">Email Address *</Label>
                          <Input id="hr_contact_email" type="email" name="hr_contact_email" value={formData.hr_contact_email} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hr_contact_phone">Phone Number</Label>
                          <Input id="hr_contact_phone" name="hr_contact_phone" value={formData.hr_contact_phone} onChange={handleChange} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-6 border-t">
                      <h3 className="text-lg font-medium mb-4">Secondary Contact (Optional)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="secondary_contact_name">Full Name</Label>
                          <Input id="secondary_contact_name" name="secondary_contact_name" value={formData.secondary_contact_name} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="secondary_contact_email">Email Address</Label>
                          <Input id="secondary_contact_email" type="email" name="secondary_contact_email" value={formData.secondary_contact_email} onChange={handleChange} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="current_insurance_provider">Current Insurance Provider</Label>
                      <Input id="current_insurance_provider" name="current_insurance_provider" value={formData.current_insurance_provider} onChange={handleChange} placeholder="e.g. BlueCross, Cigna" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insurance_plan_type">Plan Type</Label>
                      <Select value={formData.insurance_plan_type} onValueChange={(val) => handleSelectChange('insurance_plan_type', val)}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ppo">PPO</SelectItem>
                          <SelectItem value="hmo">HMO</SelectItem>
                          <SelectItem value="hdhp">HDHP</SelectItem>
                          <SelectItem value="self_funded">Self-Funded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="covered_employees">Estimated Covered Employees</Label>
                      <Input id="covered_employees" type="number" name="covered_employees" value={formData.covered_employees} onChange={handleChange} placeholder="e.g. 150" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annual_premium_budget">Annual Premium Budget ($)</Label>
                      <Input id="annual_premium_budget" type="number" name="annual_premium_budget" value={formData.annual_premium_budget} onChange={handleChange} placeholder="500000" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="coverage_start_date">Desired Coverage Start Date</Label>
                      <Input id="coverage_start_date" type="date" name="coverage_start_date" value={formData.coverage_start_date} onChange={handleChange} />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="flex flex-col items-center justify-center text-center space-y-6 py-8">
                    <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                      <UploadCloud className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-xl font-medium">Bulk Employee Import</h3>
                      <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                        You can upload your employee roster now via CSV, or skip this step and add employees later from your dashboard.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-6">
                      <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Download CSV Template
                      </Button>
                      <Button variant="secondary" className="gap-2">
                        <UploadCloud className="h-4 w-4" /> Upload Roster
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-8">
                      We'll skip this for now. You can manage employees in the Employee Management tab later.
                    </p>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-6">
                    <div className="bg-muted/50 p-6 rounded-xl border">
                      <h3 className="font-semibold mb-2">Review & Agreements</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Please review the terms and conditions to activate your employer account.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="terms_accepted" 
                            name="terms_accepted" 
                            checked={formData.terms_accepted} 
                            onCheckedChange={(c) => handleSelectChange('terms_accepted', c)} 
                          />
                          <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="terms_accepted" className="font-medium cursor-pointer">Accept Terms of Service</Label>
                            <p className="text-sm text-muted-foreground">I agree to the PayPill Master Subscription Agreement.</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="privacy_accepted" 
                            name="privacy_accepted" 
                            checked={formData.privacy_accepted} 
                            onCheckedChange={(c) => handleSelectChange('privacy_accepted', c)} 
                          />
                          <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="privacy_accepted" className="font-medium cursor-pointer">Accept Privacy Policy</Label>
                            <p className="text-sm text-muted-foreground">I acknowledge how employee data will be handled.</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            id="dpa_accepted" 
                            name="dpa_accepted" 
                            checked={formData.dpa_accepted} 
                            onCheckedChange={(c) => handleSelectChange('dpa_accepted', c)} 
                          />
                          <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="dpa_accepted" className="font-medium cursor-pointer">Data Processing Agreement</Label>
                            <p className="text-sm text-muted-foreground">I accept the DPA for compliance with HIPAA and relevant regulations.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
          <CardFooter className="flex justify-between border-t bg-muted/20 px-6 py-4">
            <Button variant="outline" onClick={handleBack} disabled={step === 1 || isSubmitting}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < 5 ? (
              <Button onClick={handleNext}>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting || !formData.terms_accepted || !formData.privacy_accepted || !formData.dpa_accepted}>
                {isSubmitting ? 'Saving...' : 'Complete Setup'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}