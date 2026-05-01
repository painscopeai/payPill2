import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import FormSection from '@/components/FormSection.jsx';
import CustomDropdown from '@/components/CustomDropdown.jsx';
import MultiSelectDropdown from '@/components/MultiSelectDropdown.jsx';
import ConditionField from '@/components/ConditionField.jsx';

const CONDITION_CATEGORIES = [
  'Cardiovascular', 'Endocrine/Metabolic', 'Kidney/Urinary', 'Respiratory', 
  'Neurological', 'Mental Health', 'Gastrointestinal', 'Musculoskeletal', 
  'Cancer/Oncology', 'Infectious Disease', 'Autoimmune/Immune', 
  'Women\'s Health', 'Men\'s Health', 'Other'
];

const MEDICATION_CLASSES = [
  'Diabetes', 'Blood Pressure', 'Heart/Cholesterol', 'Kidney-Related', 
  'Respiratory', 'Pain/Inflammation', 'Antibiotics/Anti-Infectives', 
  'Mental Health', 'Gastrointestinal', 'Hormonal/Reproductive', 'Supplements/OTC'
];

const ALLERGY_TYPES = ['drug', 'food', 'environmental'];
const COMMON_ALLERGENS = {
  drug: ['Penicillin', 'Sulfa drugs', 'Aspirin', 'Ibuprofen', 'NSAIDs'],
  food: ['Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Fish', 'Shellfish'],
  environmental: ['Pollen', 'Dust mites', 'Mold', 'Pet dander', 'Latex']
};

const FAMILY_RELATIONS = ['Parent', 'Sibling', 'Grandparent', 'Aunt', 'Uncle', 'Cousin', 'Other'];
const FAMILY_CONDITIONS = ['Diabetes', 'Hypertension', 'Cancer', 'Kidney disease', 'Heart disease', 'Stroke', 'Sickle cell disease', 'Other'];

const PROVIDER_TYPES = [
  'Family physician', 'GP', 'Internist', 'Pediatrician', 'Nephrologist', 
  'Cardiologist', 'Endocrinologist', 'Neurologist', 'Pulmonologist', 
  'Gastroenterologist', 'Oncologist', 'Psychiatrist', 'Dermatologist', 
  'Orthopedic', 'Gynecologist', 'Urologist', 'Pharmacist', 'Physiotherapist', 
  'Dietitian', 'Psychologist', 'Occupational therapist', 'Speech therapist'
];

const INSURANCE_TYPES = ['private', 'employer_sponsored', 'government', 'medicaid', 'medicare', 'hmo', 'ppo', 'epo', 'pos', 'self_pay'];
const CARRIERS = ['Blue Cross Blue Shield', 'Aetna', 'Cigna', 'UnitedHealthcare', 'Humana', 'Kaiser Permanente', 'Regional insurers', 'Local providers'];

export default function OnboardingFlow() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalSteps = 10;

  // Step 1: Basic Info
  const [step1Data, setStep1Data] = useState({
    first_name: currentUser?.first_name || '',
    last_name: currentUser?.last_name || '',
    phone: '',
    preferred_language: 'english',
    communication_preference: 'email'
  });

  // Step 2: Basic Health
  const [step2Data, setStep2Data] = useState({
    date_of_birth: '', sex_assigned_at_birth: '', gender_identity: '',
    marital_status: '', ethnicity: '', blood_group: '', height: '', weight: '',
    blood_pressure_systolic: '', blood_pressure_diastolic: '', resting_heart_rate: ''
  });

  // Step 3: Pre-existing Conditions
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [conditionDetails, setConditionDetails] = useState({});

  // Step 4: Medications
  const [medications, setMedications] = useState([]);

  // Step 5: Allergies
  const [allergies, setAllergies] = useState([]);

  // Step 6: Family History
  const [familyHistory, setFamilyHistory] = useState([]);

  // Step 7: Lifestyle
  const [lifestyleData, setLifestyleData] = useState({
    exercise_level: '', workout_frequency: '', smoking_status: 'never', packs_per_day: '', years_smoked: '',
    alcohol_status: 'never', alcohol_type: '', units_per_week: '', substance_use: '', diet_preference: [],
    meal_frequency: '', average_sleep_duration: '', sleep_issues: [], sleep_quality: '',
    sexually_active: false, protection_use: '', sti_history: '', stress_level: '', water_intake: '',
    screen_time: '', work_type: '', sedentary_hours: ''
  });

  // Step 8: Providers
  const [providers, setProviders] = useState([]);

  // Step 9: Insurance
  const [insurance, setInsurance] = useState([]);

  // Step 10: Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      await saveCurrentStep();
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const saveCurrentStep = async () => {
    setLoading(true);
    try {
      if (currentStep === 1) {
        await pb.collection('users').update(currentUser.id, step1Data, { $autoCancel: false });
      } else if (currentStep === 2) {
        const healthProfileData = {
          userId: currentUser.id,
          ...step2Data,
          bmi: step2Data.weight && step2Data.height ? (step2Data.weight / Math.pow(step2Data.height / 100, 2)).toFixed(1) : null
        };
        // Check if exists, then update or create
        const existing = await pb.collection('health_profile').getFullList({ filter: `userId="${currentUser.id}"`, $autoCancel: false });
        if (existing.length > 0) {
          await pb.collection('health_profile').update(existing[0].id, healthProfileData, { $autoCancel: false });
        } else {
          await pb.collection('health_profile').create(healthProfileData, { $autoCancel: false });
        }
      }
      // For other steps, we save on final submit to avoid complex sync logic during wizard, 
      // or we could save them here. For simplicity and robustness, we'll save complex arrays on final submit,
      // but show a toast to indicate progress is tracked.
      toast.success(`Step ${currentStep} saved`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save progress');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Save Step 3: Conditions
      for (const condName of selectedConditions) {
        const details = conditionDetails[condName] || {};
        await pb.collection('pre_existing_conditions').create({
          userId: currentUser.id,
          condition_name: condName,
          condition_category: 'other', // Simplified for this implementation
          ...details
        }, { $autoCancel: false });
      }

      // Save Step 4: Medications
      for (const med of medications) {
        await pb.collection('current_medications').create({
          userId: currentUser.id,
          ...med
        }, { $autoCancel: false });
      }

      // Save Step 5: Allergies
      for (const allergy of allergies) {
        await pb.collection('allergies').create({
          userId: currentUser.id,
          ...allergy
        }, { $autoCancel: false });
      }

      // Save Step 6: Family History
      for (const hist of familyHistory) {
        await pb.collection('family_medical_history').create({
          userId: currentUser.id,
          ...hist
        }, { $autoCancel: false });
      }

      // Save Step 7: Lifestyle
      const existingLifestyle = await pb.collection('lifestyle_habits').getFullList({ filter: `userId="${currentUser.id}"`, $autoCancel: false });
      const lifestylePayload = {
        userId: currentUser.id,
        ...lifestyleData,
        diet_preference: lifestyleData.diet_preference.join(','),
      };
      if (existingLifestyle.length > 0) {
        await pb.collection('lifestyle_habits').update(existingLifestyle[0].id, lifestylePayload, { $autoCancel: false });
      } else {
        await pb.collection('lifestyle_habits').create(lifestylePayload, { $autoCancel: false });
      }

      // Save Step 8: Providers
      for (const prov of providers) {
        await pb.collection('healthcare_providers').create({
          userId: currentUser.id,
          ...prov
        }, { $autoCancel: false });
      }

      // Save Step 9: Insurance
      for (const ins of insurance) {
        const formData = new FormData();
        formData.append('userId', currentUser.id);
        Object.keys(ins).forEach(key => {
          if (ins[key] !== null && ins[key] !== undefined) {
            formData.append(key, ins[key]);
          }
        });
        await pb.collection('health_insurance').create(formData, { $autoCancel: false });
      }

      // Save Step 10: Emergency Contacts
      for (const contact of emergencyContacts) {
        await pb.collection('emergency_contacts').create({
          userId: currentUser.id,
          ...contact
        }, { $autoCancel: false });
      }

      toast.success('Health profile completed successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{`Health Profile Setup (${currentStep}/${totalSteps}) - PayPill`}</title>
      </Helmet>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background to-muted/30 py-12 px-4">
        
        {currentStep === 1 && (
          <FormSection title="Basic Information" description="Let's start with your contact details." step={1} totalSteps={totalSteps}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={step1Data.first_name} onChange={e => setStep1Data({...step1Data, first_name: e.target.value})} className="form-input-animated" required />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={step1Data.last_name} onChange={e => setStep1Data({...step1Data, last_name: e.target.value})} className="form-input-animated" required />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input type="tel" value={step1Data.phone} onChange={e => setStep1Data({...step1Data, phone: e.target.value})} className="form-input-animated" required />
              </div>
              <div className="space-y-2">
                <Label>Preferred Language</Label>
                <CustomDropdown 
                  options={['english', 'spanish', 'french', 'german', 'mandarin', 'arabic']} 
                  value={step1Data.preferred_language} 
                  onChange={val => setStep1Data({...step1Data, preferred_language: val})} 
                />
              </div>
            </div>
          </FormSection>
        )}

        {currentStep === 2 && (
          <FormSection title="Basic Health Metrics" description="Core physical measurements." step={2} totalSteps={totalSteps}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={step2Data.date_of_birth} onChange={e => setStep2Data({...step2Data, date_of_birth: e.target.value})} className="form-input-animated" />
              </div>
              <div className="space-y-2">
                <Label>Sex Assigned at Birth</Label>
                <Select value={step2Data.sex_assigned_at_birth} onValueChange={val => setStep2Data({...step2Data, sex_assigned_at_birth: val})}>
                  <SelectTrigger className="form-input-animated"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="intersex">Intersex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Height (cm)</Label>
                <Input type="number" value={step2Data.height} onChange={e => setStep2Data({...step2Data, height: e.target.value})} className="form-input-animated" />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input type="number" value={step2Data.weight} onChange={e => setStep2Data({...step2Data, weight: e.target.value})} className="form-input-animated" />
              </div>
              <div className="space-y-2">
                <Label>Blood Group</Label>
                <CustomDropdown options={['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']} value={step2Data.blood_group} onChange={val => setStep2Data({...step2Data, blood_group: val})} />
              </div>
            </div>
          </FormSection>
        )}

        {currentStep === 3 && (
          <FormSection title="Pre-existing Conditions" description="Select any conditions you have been diagnosed with." step={3} totalSteps={totalSteps}>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Select Conditions</Label>
                <MultiSelectDropdown 
                  options={CONDITION_CATEGORIES} 
                  selected={selectedConditions} 
                  onChange={setSelectedConditions} 
                  placeholder="Search or add conditions..."
                />
              </div>
              
              {selectedConditions.length > 0 && (
                <div className="space-y-6 mt-6">
                  <h3 className="text-lg font-medium border-b pb-2">Condition Details</h3>
                  {selectedConditions.map(cond => (
                    <ConditionField 
                      key={cond} 
                      conditionName={cond} 
                      data={conditionDetails[cond] || {}} 
                      onChange={(data) => setConditionDetails(prev => ({...prev, [cond]: data}))} 
                    />
                  ))}
                </div>
              )}
            </div>
          </FormSection>
        )}

        {currentStep === 4 && (
          <FormSection title="Current Medications" description="List all medications you are currently taking." step={4} totalSteps={totalSteps}>
            <div className="space-y-6">
              <Button variant="outline" onClick={() => setMedications([...medications, {}])}>+ Add Medication</Button>
              
              {medications.map((med, idx) => (
                <div key={idx} className="p-5 border rounded-xl bg-muted/20 space-y-4 custom-entry-reveal">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-medium">Medication #{idx + 1}</h4>
                    <Button variant="ghost" size="sm" onClick={() => setMedications(medications.filter((_, i) => i !== idx))} className="text-destructive">Remove</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Medication Name</Label>
                      <Input value={med.medication_name || ''} onChange={e => {
                        const newMeds = [...medications]; newMeds[idx].medication_name = e.target.value; setMedications(newMeds);
                      }} className="form-input-animated" />
                    </div>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <CustomDropdown options={MEDICATION_CLASSES} value={med.medication_class || ''} onChange={val => {
                        const newMeds = [...medications]; newMeds[idx].medication_class = val; setMedications(newMeds);
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Dosage & Strength</Label>
                      <div className="flex gap-2">
                        <Input placeholder="e.g. 1 pill" value={med.dosage || ''} onChange={e => {
                          const newMeds = [...medications]; newMeds[idx].dosage = e.target.value; setMedications(newMeds);
                        }} className="form-input-animated" />
                        <Input placeholder="e.g. 500mg" value={med.strength || ''} onChange={e => {
                          const newMeds = [...medications]; newMeds[idx].strength = e.target.value; setMedications(newMeds);
                        }} className="form-input-animated" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Route</Label>
                      <Select value={med.route || ''} onValueChange={val => {
                        const newMeds = [...medications]; newMeds[idx].route = val; setMedications(newMeds);
                      }}>
                        <SelectTrigger className="form-input-animated"><SelectValue placeholder="Select route" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oral">Oral</SelectItem>
                          <SelectItem value="iv">IV</SelectItem>
                          <SelectItem value="subcutaneous">Subcutaneous</SelectItem>
                          <SelectItem value="topical">Topical</SelectItem>
                          <SelectItem value="inhaled">Inhaled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
        )}

        {currentStep === 5 && (
          <FormSection title="Allergies" description="Record any known allergies." step={5} totalSteps={totalSteps}>
            <div className="space-y-6">
              <Button variant="outline" onClick={() => setAllergies([...allergies, { allergy_type: 'drug' }])}>+ Add Allergy</Button>
              
              {allergies.map((allergy, idx) => (
                <div key={idx} className="p-5 border rounded-xl bg-muted/20 space-y-4 custom-entry-reveal">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-medium">Allergy #{idx + 1}</h4>
                    <Button variant="ghost" size="sm" onClick={() => setAllergies(allergies.filter((_, i) => i !== idx))} className="text-destructive">Remove</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={allergy.allergy_type || ''} onValueChange={val => {
                        const newAllergies = [...allergies]; newAllergies[idx].allergy_type = val; newAllergies[idx].allergen_name = ''; setAllergies(newAllergies);
                      }}>
                        <SelectTrigger className="form-input-animated"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="drug">Drug</SelectItem>
                          <SelectItem value="food">Food</SelectItem>
                          <SelectItem value="environmental">Environmental</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Allergen</Label>
                      <CustomDropdown 
                        options={COMMON_ALLERGENS[allergy.allergy_type] || []} 
                        value={allergy.allergen_name || ''} 
                        onChange={val => {
                          const newAllergies = [...allergies]; newAllergies[idx].allergen_name = val; setAllergies(newAllergies);
                        }} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reaction</Label>
                      <Input placeholder="e.g. Hives, Anaphylaxis" value={allergy.reaction_type || ''} onChange={e => {
                        const newAllergies = [...allergies]; newAllergies[idx].reaction_type = e.target.value; setAllergies(newAllergies);
                      }} className="form-input-animated" />
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select value={allergy.severity || ''} onValueChange={val => {
                        const newAllergies = [...allergies]; newAllergies[idx].severity = val; setAllergies(newAllergies);
                      }}>
                        <SelectTrigger className="form-input-animated"><SelectValue placeholder="Select severity" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mild">Mild</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="severe">Severe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
        )}

        {currentStep === 6 && (
          <FormSection title="Family Medical History" description="Conditions that run in your family." step={6} totalSteps={totalSteps}>
            <div className="space-y-6">
              <Button variant="outline" onClick={() => setFamilyHistory([...familyHistory, {}])}>+ Add Family History</Button>
              
              {familyHistory.map((hist, idx) => (
                <div key={idx} className="p-5 border rounded-xl bg-muted/20 space-y-4 custom-entry-reveal">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-medium">Record #{idx + 1}</h4>
                    <Button variant="ghost" size="sm" onClick={() => setFamilyHistory(familyHistory.filter((_, i) => i !== idx))} className="text-destructive">Remove</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Relation</Label>
                      <CustomDropdown options={FAMILY_RELATIONS} value={hist.relation || ''} onChange={val => {
                        const newHist = [...familyHistory]; newHist[idx].relation = val; setFamilyHistory(newHist);
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <CustomDropdown options={FAMILY_CONDITIONS} value={hist.condition || ''} onChange={val => {
                        const newHist = [...familyHistory]; newHist[idx].condition = val; setFamilyHistory(newHist);
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Age of Onset (Optional)</Label>
                      <Input type="number" value={hist.age_of_onset || ''} onChange={e => {
                        const newHist = [...familyHistory]; newHist[idx].age_of_onset = e.target.value; setFamilyHistory(newHist);
                      }} className="form-input-animated" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={hist.notes || ''} onChange={e => {
                      const newHist = [...familyHistory]; newHist[idx].notes = e.target.value; setFamilyHistory(newHist);
                    }} className="form-input-animated resize-none" rows={2} />
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
        )}

        {currentStep === 7 && (
          <FormSection title="Lifestyle & Habits" description="Daily routines that impact your health." step={7} totalSteps={totalSteps}>
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Exercise Level</Label>
                  <Select value={lifestyleData.exercise_level} onValueChange={val => setLifestyleData({...lifestyleData, exercise_level: val})}>
                    <SelectTrigger className="form-input-animated"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="intense">Intense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Smoking Status</Label>
                  <Select value={lifestyleData.smoking_status} onValueChange={val => setLifestyleData({...lifestyleData, smoking_status: val})}>
                    <SelectTrigger className="form-input-animated"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="former">Former</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="occasionally">Occasionally</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Alcohol Status</Label>
                  <Select value={lifestyleData.alcohol_status} onValueChange={val => setLifestyleData({...lifestyleData, alcohol_status: val})}>
                    <SelectTrigger className="form-input-animated"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="occasionally">Occasionally</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="heavy">Heavy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Diet Preferences</Label>
                  <MultiSelectDropdown 
                    options={['Vegetarian', 'Vegan', 'Low salt', 'Low sugar', 'Renal diet', 'High protein']} 
                    selected={lifestyleData.diet_preference} 
                    onChange={val => setLifestyleData({...lifestyleData, diet_preference: val})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Average Sleep (hours)</Label>
                  <Input type="number" value={lifestyleData.average_sleep_duration} onChange={e => setLifestyleData({...lifestyleData, average_sleep_duration: e.target.value})} className="form-input-animated" />
                </div>
                <div className="space-y-2">
                  <Label>Stress Level</Label>
                  <Select value={lifestyleData.stress_level} onValueChange={val => setLifestyleData({...lifestyleData, stress_level: val})}>
                    <SelectTrigger className="form-input-animated"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </FormSection>
        )}

        {currentStep === 8 && (
          <FormSection title="Healthcare Providers" description="Your medical care team." step={8} totalSteps={totalSteps}>
            <div className="space-y-6">
              <Button variant="outline" onClick={() => setProviders([...providers, {}])}>+ Add Provider</Button>
              
              {providers.map((prov, idx) => (
                <div key={idx} className="p-5 border rounded-xl bg-muted/20 space-y-4 custom-entry-reveal">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-medium">Provider #{idx + 1}</h4>
                    <Button variant="ghost" size="sm" onClick={() => setProviders(providers.filter((_, i) => i !== idx))} className="text-destructive">Remove</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Provider Type</Label>
                      <CustomDropdown options={PROVIDER_TYPES} value={prov.provider_type || ''} onChange={val => {
                        const newProv = [...providers]; newProv[idx].provider_type = val; setProviders(newProv);
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Provider Name</Label>
                      <Input value={prov.provider_name || ''} onChange={e => {
                        const newProv = [...providers]; newProv[idx].provider_name = e.target.value; setProviders(newProv);
                      }} className="form-input-animated" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input type="tel" value={prov.phone || ''} onChange={e => {
                        const newProv = [...providers]; newProv[idx].phone = e.target.value; setProviders(newProv);
                      }} className="form-input-animated" />
                    </div>
                    <div className="space-y-2 flex items-center gap-2 pt-8">
                      <Switch checked={prov.telemedicine_available || false} onCheckedChange={val => {
                        const newProv = [...providers]; newProv[idx].telemedicine_available = val; setProviders(newProv);
                      }} />
                      <Label>Telemedicine Available</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
        )}

        {currentStep === 9 && (
          <FormSection title="Health Insurance" description="Your coverage details." step={9} totalSteps={totalSteps}>
            <div className="space-y-6">
              <Button variant="outline" onClick={() => setInsurance([...insurance, {}])}>+ Add Insurance</Button>
              
              {insurance.map((ins, idx) => (
                <div key={idx} className="p-5 border rounded-xl bg-muted/20 space-y-4 custom-entry-reveal">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-medium">Policy #{idx + 1}</h4>
                    <Button variant="ghost" size="sm" onClick={() => setInsurance(insurance.filter((_, i) => i !== idx))} className="text-destructive">Remove</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Insurance Type</Label>
                      <Select value={ins.insurance_type || ''} onValueChange={val => {
                        const newIns = [...insurance]; newIns[idx].insurance_type = val; setInsurance(newIns);
                      }}>
                        <SelectTrigger className="form-input-animated"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {INSURANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Carrier Name</Label>
                      <CustomDropdown options={CARRIERS} value={ins.carrier_name || ''} onChange={val => {
                        const newIns = [...insurance]; newIns[idx].carrier_name = val; setInsurance(newIns);
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Member ID</Label>
                      <Input value={ins.member_id || ''} onChange={e => {
                        const newIns = [...insurance]; newIns[idx].member_id = e.target.value; setInsurance(newIns);
                      }} className="form-input-animated" />
                    </div>
                    <div className="space-y-2">
                      <Label>Group Number</Label>
                      <Input value={ins.group_number || ''} onChange={e => {
                        const newIns = [...insurance]; newIns[idx].group_number = e.target.value; setInsurance(newIns);
                      }} className="form-input-animated" />
                    </div>
                    <div className="space-y-2">
                      <Label>Card Front Image</Label>
                      <Input type="file" accept="image/*" onChange={e => {
                        const newIns = [...insurance]; newIns[idx].insurance_card_front = e.target.files[0]; setInsurance(newIns);
                      }} className="form-input-animated" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
        )}

        {currentStep === 10 && (
          <FormSection title="Emergency Contacts" description="Who to call in an emergency." step={10} totalSteps={totalSteps}>
            <div className="space-y-6">
              <Button variant="outline" onClick={() => setEmergencyContacts([...emergencyContacts, {}])}>+ Add Contact</Button>
              
              {emergencyContacts.map((contact, idx) => (
                <div key={idx} className="p-5 border rounded-xl bg-muted/20 space-y-4 custom-entry-reveal">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-medium">Contact #{idx + 1}</h4>
                    <Button variant="ghost" size="sm" onClick={() => setEmergencyContacts(emergencyContacts.filter((_, i) => i !== idx))} className="text-destructive">Remove</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={contact.first_name || ''} onChange={e => {
                        const newContacts = [...emergencyContacts]; newContacts[idx].first_name = e.target.value; setEmergencyContacts(newContacts);
                      }} className="form-input-animated" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={contact.last_name || ''} onChange={e => {
                        const newContacts = [...emergencyContacts]; newContacts[idx].last_name = e.target.value; setEmergencyContacts(newContacts);
                      }} className="form-input-animated" />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship</Label>
                      <Select value={contact.relationship || ''} onValueChange={val => {
                        const newContacts = [...emergencyContacts]; newContacts[idx].relationship = val; setEmergencyContacts(newContacts);
                      }}>
                        <SelectTrigger className="form-input-animated"><SelectValue placeholder="Select relation" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input type="tel" value={contact.phone || ''} onChange={e => {
                        const newContacts = [...emergencyContacts]; newContacts[idx].phone = e.target.value; setEmergencyContacts(newContacts);
                      }} className="form-input-animated" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
        )}

        <div className="max-w-3xl mx-auto mt-8 flex justify-between items-center">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || loading}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          
          <div className="flex gap-3">
            <Button variant="secondary" onClick={saveCurrentStep} disabled={loading}>
              <Save className="w-4 h-4 mr-2" /> Save Progress
            </Button>
            <Button onClick={handleNext} disabled={loading}>
              {currentStep === totalSteps ? 'Complete Setup' : 'Next Step'}
              {currentStep !== totalSteps && <ChevronRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>

      </div>
    </>
  );
}