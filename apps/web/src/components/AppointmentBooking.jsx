import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Search, Calendar as CalendarIcon, Clock, User, Building, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { format } from 'date-fns';

export default function AppointmentBooking() {
  const { currentUser } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('in-person');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [insuranceVerified, setInsuranceVerified] = useState(false);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const records = await pb.collection('healthcare_providers').getFullList({
          sort: 'provider_name',
          $autoCancel: false
        });
        setProviders(records);
      } catch (error) {
        console.error('Error fetching providers:', error);
        toast.error('Failed to load providers');
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, []);

  const filteredProviders = providers.filter(p => 
    specialtyFilter === 'all' || p.specialty?.toLowerCase().includes(specialtyFilter.toLowerCase())
  );

  const handleBook = async () => {
    if (!selectedProvider || !date || !time || !reason || !insuranceVerified) {
      toast.error('Please complete all required fields and verify insurance.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiServerClient.fetch('/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          provider_id: selectedProvider.id,
          provider_name: selectedProvider.provider_name,
          appointment_date: format(date, 'yyyy-MM-dd'),
          appointment_time: time,
          type: typeFilter,
          reason: reason
        })
      });

      if (!response.ok) throw new Error('Booking failed');
      
      toast.success('Appointment booked successfully!');
      // Reset form
      setSelectedProvider(null);
      setTime('');
      setReason('');
      setInsuranceVerified(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '01:00 PM', '01:30 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Provider Selection */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="shadow-md border-border/50">
          <CardHeader>
            <CardTitle>Find a Provider</CardTitle>
            <CardDescription>Search by specialty and appointment type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Specialty</Label>
                <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Specialties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    <SelectItem value="cardiologist">Cardiologist</SelectItem>
                    <SelectItem value="endocrinologist">Endocrinologist</SelectItem>
                    <SelectItem value="primary care">Primary Care</SelectItem>
                    <SelectItem value="dermatologist">Dermatologist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visit Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Visit Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-person">In-person</SelectItem>
                    <SelectItem value="telemedicine">Telemedicine</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 mt-6 max-h-[500px] overflow-y-auto pr-2">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : filteredProviders.length > 0 ? (
                filteredProviders.map(provider => (
                  <div 
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedProvider?.id === provider.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          {provider.provider_name}
                        </h4>
                        <p className="text-sm text-muted-foreground capitalize">{provider.specialty || provider.provider_type}</p>
                      </div>
                      <div className="flex items-center text-sm font-medium text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current mr-1" /> 4.8
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Building className="h-3.5 w-3.5" /> {provider.hospital_affiliation || 'Independent Practice'}</div>
                      <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Accepting New Patients</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No providers found matching your criteria.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Booking Details */}
      <div className="lg:col-span-7">
        <Card className={`shadow-md border-border/50 transition-opacity duration-300 ${!selectedProvider ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <CardHeader>
            <CardTitle>Schedule Appointment</CardTitle>
            <CardDescription>
              {selectedProvider ? `Booking with ${selectedProvider.provider_name}` : 'Select a provider first'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Select Date</Label>
                <div className="border rounded-md p-2 bg-card">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || date.getDay() === 0 || date.getDay() === 6}
                    className="rounded-md"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Select Time</Label>
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map(t => (
                    <Button
                      key={t}
                      variant={time === t ? 'default' : 'outline'}
                      className={`justify-center ${time === t ? 'bg-primary text-primary-foreground' : ''}`}
                      onClick={() => setTime(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label>Reason for Visit</Label>
              <Textarea 
                placeholder="Briefly describe your symptoms or reason for the appointment..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="resize-none h-24"
              />
            </div>

            <div className="flex items-start space-x-3 pt-2">
              <Checkbox 
                id="insurance" 
                checked={insuranceVerified}
                onCheckedChange={setInsuranceVerified}
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="insurance" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Verify Insurance Coverage
                </label>
                <p className="text-sm text-muted-foreground">
                  I confirm that my insurance information on file is up to date and I understand I may be responsible for co-pays.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-6">
            <Button 
              className="w-full md:w-auto ml-auto" 
              size="lg"
              onClick={handleBook}
              disabled={submitting || !selectedProvider || !date || !time || !reason || !insuranceVerified}
            >
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking...</> : 'Confirm Appointment'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}