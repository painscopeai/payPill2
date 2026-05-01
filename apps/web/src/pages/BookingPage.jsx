import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Calendar, Clock, MapPin, CheckCircle2, Loader2 } from 'lucide-react';

export default function BookingPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [confirmation, setConfirmation] = useState(null);

  const [formData, setFormData] = useState({
    providerName: 'Dr. Sarah Jenkins',
    appointmentType: 'consultation',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
    insuranceInfo: 'Blue Cross Blue Shield',
    copayAmount: 25
  });

  const handleBook = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiServerClient.fetch('/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'demo-user',
          providerId: 'prov-123',
          providerName: formData.providerName,
          appointmentType: formData.appointmentType,
          appointmentDate: formData.appointmentDate,
          appointmentTime: formData.appointmentTime,
          location: '123 Medical Center Blvd, Suite 400',
          reason: formData.reason,
          insuranceInfo: formData.insuranceInfo,
          copayAmount: formData.copayAmount
        })
      });

      if (!response.ok) throw new Error('Booking failed');
      
      const data = await response.json();
      setConfirmation(data);
      setStep(2);
      toast.success('Appointment booked successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Helmet><title>Book Appointment - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
        <div className="w-full max-w-2xl">
          {step === 1 ? (
            <Card className="shadow-lg border-border/50">
              <CardHeader className="bg-background border-b pb-6">
                <CardTitle className="text-2xl">Schedule Appointment</CardTitle>
                <CardDescription>Book a visit with {formData.providerName}</CardDescription>
              </CardHeader>
              <form onSubmit={handleBook}>
                <CardContent className="p-6 space-y-6 bg-background">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Visit Type</Label>
                      <Select value={formData.appointmentType} onValueChange={v => setFormData({...formData, appointmentType: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consultation">Consultation</SelectItem>
                          <SelectItem value="follow-up">Follow-up</SelectItem>
                          <SelectItem value="annual-physical">Annual Physical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Insurance</Label>
                      <Select value={formData.insuranceInfo} onValueChange={v => setFormData({...formData, insuranceInfo: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Blue Cross Blue Shield">Blue Cross Blue Shield</SelectItem>
                          <SelectItem value="Aetna">Aetna</SelectItem>
                          <SelectItem value="Self-Pay">Self-Pay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred Date</Label>
                      <Input type="date" required value={formData.appointmentDate} onChange={e => setFormData({...formData, appointmentDate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred Time</Label>
                      <Input type="time" required value={formData.appointmentTime} onChange={e => setFormData({...formData, appointmentTime: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Reason for Visit</Label>
                    <Textarea required placeholder="Briefly describe your symptoms or reason for visit..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg border flex justify-between items-center">
                    <span className="font-medium">Estimated Copay</span>
                    <span className="text-xl font-bold text-primary">${formData.copayAmount}</span>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/10 border-t p-6 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Booking
                  </Button>
                </CardFooter>
              </form>
            </Card>
          ) : (
            <Card className="shadow-lg border-border/50 text-center py-8">
              <CardContent className="space-y-6">
                <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-bold">Booking Confirmed!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your appointment with {confirmation?.provider} has been scheduled. A confirmation email has been sent to you.
                </p>
                
                <div className="bg-muted/20 border rounded-xl p-6 max-w-md mx-auto text-left space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date & Time</p>
                      <p className="font-medium">{confirmation?.appointmentDate} at {confirmation?.appointmentTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{confirmation?.location}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground text-center">Confirmation #: <span className="font-mono font-medium text-foreground">{confirmation?.confirmationNumber}</span></p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-center gap-4 pt-4">
                <Button variant="outline" onClick={() => navigate('/patient/appointments')}>View Appointments</Button>
                <Button onClick={() => navigate('/patient/dashboard')}>Go to Dashboard</Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}