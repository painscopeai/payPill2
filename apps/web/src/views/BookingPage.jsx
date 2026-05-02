import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Calendar, MapPin, CheckCircle2, Loader2 } from 'lucide-react';

export default function BookingPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [confirmation, setConfirmation] = useState(null);

  const [visitTypes, setVisitTypes] = useState([]);
  const [insuranceOptions, setInsuranceOptions] = useState([]);
  const [providers, setProviders] = useState([]);

  const [formData, setFormData] = useState({
    providerId: '',
    appointmentType: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
    insuranceOptionId: '',
    copayAmount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      try {
        const res = await apiServerClient.fetch('/appointment-catalog');
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to load booking options');
        }
        const data = await res.json();
        if (cancelled) return;
        setVisitTypes(data.visitTypes || []);
        setInsuranceOptions(data.insuranceOptions || []);
        setProviders(data.providers || []);

        const firstVt = data.visitTypes?.[0];
        const firstIns = data.insuranceOptions?.[0];
        const firstProv = data.providers?.[0];
        setFormData((prev) => ({
          ...prev,
          appointmentType: firstVt?.slug || '',
          insuranceOptionId: firstIns?.id || '',
          providerId: firstProv?.id || '',
          copayAmount:
            firstIns?.copay_estimate != null ? Number(firstIns.copay_estimate) : 0,
        }));
      } catch (e) {
        if (!cancelled) toast.error(e.message);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedInsurance = useMemo(
    () => insuranceOptions.find((x) => x.id === formData.insuranceOptionId),
    [insuranceOptions, formData.insuranceOptionId],
  );

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === formData.providerId),
    [providers, formData.providerId],
  );

  useEffect(() => {
    if (!selectedInsurance) return;
    const copay =
      selectedInsurance.copay_estimate != null ? Number(selectedInsurance.copay_estimate) : 0;
    setFormData((prev) => ({ ...prev, copayAmount: copay }));
  }, [selectedInsurance]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) {
      toast.error('Please sign in to book.');
      return;
    }
    if (!formData.providerId) {
      toast.error('Select a provider.');
      return;
    }
    if (!formData.appointmentType) {
      toast.error('Select a visit type.');
      return;
    }
    setLoading(true);
    try {
      const insLabel = selectedInsurance?.label || '';
      const pname =
        selectedProvider?.provider_name ||
        selectedProvider?.name ||
        'Provider';
      const location = selectedProvider?.address || '';

      const response = await apiServerClient.fetch('/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          providerId: formData.providerId,
          providerName: pname,
          appointmentType: formData.appointmentType,
          appointmentDate: formData.appointmentDate,
          appointmentTime: formData.appointmentTime,
          location: location || undefined,
          reason: formData.reason,
          insuranceInfo: insLabel,
          copayAmount: formData.copayAmount,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Booking failed');
      }

      const data = await response.json();
      setConfirmation(data);
      setStep(2);
      toast.success('Appointment booked successfully!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const visitTypeLabel = (slug) => visitTypes.find((v) => v.slug === slug)?.label || slug;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Helmet>
        <title>Book Appointment - PayPill</title>
      </Helmet>

      <main className="flex flex-1 justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-2xl">
          {step === 1 ? (
            <Card className="shadow-lg border-border/50">
              <CardHeader className="bg-background border-b pb-6">
                <CardTitle className="text-2xl">Schedule Appointment</CardTitle>
              </CardHeader>
              <form onSubmit={handleBook}>
                <CardContent className="p-6 space-y-6 bg-background">
                  {catalogLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading options…
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Provider</Label>
                        <Select
                          value={formData.providerId || undefined}
                          onValueChange={(v) => setFormData({ ...formData, providerId: v })}
                          required
                          disabled={providers.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                providers.length === 0
                                  ? 'No verified providers available'
                                  : 'Select provider'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {providers.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.provider_name || p.name}
                                {p.specialty ? ` · ${p.specialty}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Visit Type</Label>
                          <Select
                            value={formData.appointmentType || undefined}
                            onValueChange={(v) => setFormData({ ...formData, appointmentType: v })}
                            required
                            disabled={visitTypes.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select visit type" />
                            </SelectTrigger>
                            <SelectContent>
                              {visitTypes.map((v) => (
                                <SelectItem key={v.id} value={v.slug}>
                                  {v.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Insurance</Label>
                          <Select
                            value={formData.insuranceOptionId || undefined}
                            onValueChange={(v) => setFormData({ ...formData, insuranceOptionId: v })}
                            disabled={insuranceOptions.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select insurance" />
                            </SelectTrigger>
                            <SelectContent>
                              {insuranceOptions.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Preferred Date</Label>
                          <Input
                            type="date"
                            required
                            value={formData.appointmentDate}
                            onChange={(e) =>
                              setFormData({ ...formData, appointmentDate: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Preferred Time</Label>
                          <Input
                            type="time"
                            required
                            value={formData.appointmentTime}
                            onChange={(e) =>
                              setFormData({ ...formData, appointmentTime: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Reason for Visit</Label>
                        <Textarea
                          required
                          placeholder="Briefly describe your symptoms or reason for visit..."
                          value={formData.reason}
                          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        />
                      </div>

                      <div className="bg-muted/30 p-4 rounded-lg border flex justify-between items-center">
                        <span className="font-medium">Estimated Copay</span>
                        <span className="text-xl font-bold text-primary">
                          ${Number(formData.copayAmount || 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter className="bg-muted/10 border-t p-6 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || catalogLoading || providers.length === 0}>
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
                  Your appointment with {confirmation?.provider} has been scheduled. A confirmation email has been sent
                  to you.
                </p>

                <div className="bg-muted/20 border rounded-xl p-6 max-w-md mx-auto text-left space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date & Time</p>
                      <p className="font-medium">
                        {confirmation?.appointmentDate} at {confirmation?.appointmentTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Visit type</p>
                      <p className="font-medium">{visitTypeLabel(formData.appointmentType)}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground text-center">
                      Confirmation #:{' '}
                      <span className="font-mono font-medium text-foreground">
                        {confirmation?.confirmationNumber}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-center gap-4 pt-4">
                <Button variant="outline" onClick={() => navigate('/patient/appointments')}>
                  View Appointments
                </Button>
                <Button onClick={() => navigate('/patient/dashboard')}>Go to Dashboard</Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
