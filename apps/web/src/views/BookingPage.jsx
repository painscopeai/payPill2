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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { toast } from 'sonner';
import { Calendar, MapPin, CheckCircle2, Loader2, ExternalLink, Info, CalendarClock, FileText, Pill, FlaskConical } from 'lucide-react';
import { fulfillmentKindFromSpecialty } from '@/lib/consultationFulfillment';
import { normalizeAppointmentTime } from '@/lib/appointmentDateTime';
import { publicFormUrl } from '@/lib/publicFormUrl';

function todayYmdLocal() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatCatalogLinePrice(row) {
  const n = Number(row.price);
  const cur = row.currency || 'USD';
  return Number.isFinite(n) ? `${cur} ${n.toFixed(2)}` : '—';
}

export default function BookingPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [confirmation, setConfirmation] = useState(null);

  const [visitTypes, setVisitTypes] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [providers, setProviders] = useState([]);

  const [formData, setFormData] = useState({
    specialtySlug: '',
    providerId: '',
    providerServiceId: '',
    appointmentType: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
  });

  const [slotState, setSlotState] = useState({
    loading: false,
    slots: [],
    weeklySummary: [],
    timezone: 'UTC',
    durationMinutes: 30,
    availableTimes: [],
    error: '',
  });

  const [pendingFulfillment, setPendingFulfillment] = useState({ loading: false, items: [] });
  const [assigningFulfillment, setAssigningFulfillment] = useState(false);

  const selectedSpecialty = useMemo(
    () => specialties.find((s) => s.slug === formData.specialtySlug) || null,
    [specialties, formData.specialtySlug],
  );

  const fulfillmentKind = useMemo(
    () => fulfillmentKindFromSpecialty(selectedSpecialty),
    [selectedSpecialty],
  );

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
        const catalogSpecialties = data.specialties || [];
        const catalogProviders = data.providers || [];
        setVisitTypes(data.visitTypes || []);
        setSpecialties(catalogSpecialties);
        setProviders(catalogProviders);

        const firstVt = data.visitTypes?.[0];
        const firstSpec = catalogSpecialties[0]?.slug || '';
        const firstProv = firstSpec
          ? catalogProviders.find((p) => p.specialty_slug === firstSpec)
          : catalogProviders[0];
        setFormData((prev) => ({
          ...prev,
          specialtySlug: firstSpec,
          appointmentType: firstVt?.slug || '',
          providerId: firstProv?.id || '',
          providerServiceId: '',
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

  useEffect(() => {
    if (!formData.providerId || !formData.appointmentDate) {
      setSlotState((s) => ({
        ...s,
        loading: false,
        slots: [],
        weeklySummary: [],
        availableTimes: [],
        error: '',
      }));
      return;
    }
    let cancelled = false;
    (async () => {
      setSlotState((s) => ({ ...s, loading: true, error: '' }));
      try {
        const q = new URLSearchParams({
          providerId: formData.providerId,
          date: formData.appointmentDate,
        });
        const res = await apiServerClient.fetch(`/patient/booking/slots?${q.toString()}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Could not load time slots');
        if (cancelled) return;
        const slots = Array.isArray(body.slots) ? body.slots : [];
        const availableTimes = Array.isArray(body.available_times) ? body.available_times : [];
        setSlotState({
          loading: false,
          slots,
          weeklySummary: Array.isArray(body.weekly_summary) ? body.weekly_summary : [],
          timezone: body.timezone || 'UTC',
          durationMinutes: body.duration_minutes || 30,
          availableTimes,
          error: '',
        });
        setFormData((prev) => {
          if (availableTimes.includes(prev.appointmentTime)) return prev;
          return { ...prev, appointmentTime: availableTimes[0] || '' };
        });
      } catch (e) {
        if (!cancelled) {
          setSlotState((s) => ({
            ...s,
            loading: false,
            slots: [],
            weeklySummary: [],
            availableTimes: [],
            error: e?.message || 'Failed to load slots',
          }));
          setFormData((p) => ({ ...p, appointmentTime: '' }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.providerId, formData.appointmentDate]);

  useEffect(() => {
    if (!currentUser?.id || !fulfillmentKind) {
      setPendingFulfillment({ loading: false, items: [] });
      return;
    }
    let cancelled = false;
    (async () => {
      setPendingFulfillment((s) => ({ ...s, loading: true }));
      try {
        const res = await apiServerClient.fetch(
          `/patient/pending-fulfillment?kind=${encodeURIComponent(fulfillmentKind)}`,
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Failed to load pending orders');
        if (cancelled) return;
        setPendingFulfillment({
          loading: false,
          items: Array.isArray(body.items) ? body.items : [],
        });
      } catch (e) {
        if (!cancelled) {
          setPendingFulfillment({ loading: false, items: [] });
          toast.error(e.message || 'Could not load orders from your doctor');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, fulfillmentKind]);

  const assignPendingFulfillment = async (providerOrgId) => {
    if (!fulfillmentKind || !providerOrgId || pendingFulfillment.items.length === 0) return true;
    setAssigningFulfillment(true);
    try {
      const res = await apiServerClient.fetch('/patient/pending-fulfillment/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfillment_org_id: providerOrgId,
          kind: fulfillmentKind,
          queue_item_ids: pendingFulfillment.items.map((i) => i.id),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to link orders to provider');
      if (body.assigned > 0) {
        setPendingFulfillment({ loading: false, items: [] });
        toast.success(
          body.assigned === 1
            ? 'Your order was sent to the selected provider.'
            : `${body.assigned} orders were sent to the selected provider.`,
        );
      }
      return true;
    } catch (e) {
      toast.error(e.message || 'Could not link orders to this provider');
      return false;
    } finally {
      setAssigningFulfillment(false);
    }
  };

  const filteredProviders = useMemo(() => {
    if (!formData.specialtySlug) return [];
    return providers.filter((p) => p.specialty_slug === formData.specialtySlug);
  }, [providers, formData.specialtySlug]);

  const selectedProvider = useMemo(
    () => filteredProviders.find((p) => p.id === formData.providerId),
    [filteredProviders, formData.providerId],
  );

  const selectedCatalogService = useMemo(() => {
    if (!formData.providerServiceId || !selectedProvider?.services?.length) return null;
    return selectedProvider.services.find((s) => s.id === formData.providerServiceId) || null;
  }, [formData.providerServiceId, selectedProvider]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) {
      toast.error('Please sign in to book.');
      return;
    }
    if (!formData.specialtySlug) {
      toast.error('Select a specialty.');
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
    if (!formData.appointmentDate) {
      toast.error('Select a preferred date.');
      return;
    }
    if (slotState.loading) {
      toast.error('Still loading available times…');
      return;
    }
    if (slotState.error) {
      toast.error(slotState.error);
      return;
    }
    if (!slotState.availableTimes?.includes(formData.appointmentTime)) {
      toast.error('Choose an available time for this provider and date.');
      return;
    }
    const timeNormalized = normalizeAppointmentTime(formData.appointmentTime);
    if (!timeNormalized) {
      toast.error('Enter a valid preferred time.');
      return;
    }
    if (pendingFulfillment.items.length > 0 && formData.providerId) {
      const linked = await assignPendingFulfillment(formData.providerId);
      if (!linked) return;
    }

    setLoading(true);
    try {
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
          appointmentTime: timeNormalized,
          location: location || undefined,
          reason: formData.reason,
          ...(formData.providerServiceId ? { providerServiceId: formData.providerServiceId } : {}),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg =
          err.hint ||
          err.detail ||
          err.error ||
          (response.status === 503 ? 'Service temporarily unavailable.' : 'Booking failed');
        throw new Error(msg);
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

  const schedulingUrl = selectedProvider?.scheduling_url?.trim() || '';

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
                    <TooltipProvider delayDuration={200}>
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Specialty</Label>
                        <Select
                          value={formData.specialtySlug || undefined}
                          onValueChange={(v) => {
                            const nextProviders = providers.filter((p) => p.specialty_slug === v);
                            setFormData({
                              ...formData,
                              specialtySlug: v,
                              providerId: nextProviders[0]?.id || '',
                              providerServiceId: '',
                            });
                            setPendingFulfillment({ loading: false, items: [] });
                          }}
                          required
                          disabled={specialties.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                specialties.length === 0
                                  ? 'No specialties available yet'
                                  : 'Select specialty'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {specialties.map((s) => (
                              <SelectItem key={s.slug} value={s.slug}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {fulfillmentKind && (pendingFulfillment.loading || pendingFulfillment.items.length > 0) ? (
                        <div className="rounded-lg border border-teal-200/80 bg-teal-50/50 dark:bg-teal-950/20 p-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            {fulfillmentKind === 'pharmacy' ? (
                              <Pill className="h-4 w-4 text-teal-600" />
                            ) : (
                              <FlaskConical className="h-4 w-4 text-teal-600" />
                            )}
                            Orders from your doctor
                          </div>
                          {pendingFulfillment.loading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading pending orders…
                            </div>
                          ) : (
                            <>
                              <ul className="text-sm space-y-2 list-disc pl-5 text-muted-foreground">
                                {pendingFulfillment.items.map((item) => (
                                  <li key={item.id}>
                                    <span className="text-foreground font-medium">{item.summary}</span>
                                    {item.clinical_org_name ? (
                                      <span> — from {item.clinical_org_name}</span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                              <p className="text-xs text-muted-foreground">
                                Select a {fulfillmentKind === 'pharmacy' ? 'pharmacy' : 'laboratory'} below to send
                                these orders there. Your appointment will be scheduled with that provider.
                              </p>
                            </>
                          )}
                        </div>
                      ) : null}

                      <div className="space-y-2 md:col-span-2">
                        <Label>Provider</Label>
                        <Select
                          value={formData.providerId || undefined}
                          onValueChange={async (v) => {
                            setFormData({ ...formData, providerId: v, providerServiceId: '' });
                            if (pendingFulfillment.items.length > 0) {
                              await assignPendingFulfillment(v);
                            }
                          }}
                          required
                          disabled={
                            assigningFulfillment ||
                            !formData.specialtySlug ||
                            filteredProviders.length === 0
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !formData.specialtySlug
                                  ? 'Select a specialty first'
                                  : filteredProviders.length === 0
                                    ? 'No providers for this specialty'
                                    : 'Select provider'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProviders.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.provider_name || p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedProvider?.services?.length > 0 ? (
                        <div className="space-y-2 md:col-span-2">
                          <Label>Provider services &amp; pricing</Label>
                          <Select
                            value={formData.providerServiceId || '__none__'}
                            onValueChange={(v) =>
                              setFormData({
                                ...formData,
                                providerServiceId: v === '__none__' ? '' : v,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="General visit (no specific line)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">General visit — no catalog line</SelectItem>
                              {selectedProvider.services.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} · {formatCatalogLinePrice(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            From this provider&apos;s published price list (your plan copay below is still the main
                            estimate).
                          </p>
                          {selectedCatalogService &&
                          (selectedCatalogService.consentForm || selectedCatalogService.intakeForm) ? (
                            <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-2">
                              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-primary" />
                                Forms for this service
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Complete these before your visit if your provider requires them. Links open in a new tab.
                              </p>
                              <div className="flex flex-wrap gap-3">
                                {selectedCatalogService.consentForm ? (
                                  <a
                                    href={publicFormUrl(selectedCatalogService.consentForm.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                                  >
                                    View consent form
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                ) : null}
                                {selectedCatalogService.intakeForm ? (
                                  <a
                                    href={publicFormUrl(selectedCatalogService.intakeForm.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                                  >
                                    Complete intake (assessment)
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

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
                          <Label>Preferred Date</Label>
                          <Input
                            type="date"
                            required
                            min={todayYmdLocal()}
                            value={formData.appointmentDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                appointmentDate: e.target.value,
                                appointmentTime: '',
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Label htmlFor="book-time-slot" className="mb-0">
                              Preferred start time
                            </Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                  aria-label="How appointment times work"
                                >
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-xs border bg-popover p-3 text-left text-popover-foreground shadow-md"
                              >
                                <p className="text-xs font-medium text-foreground mb-1">Provider availability</p>
                                <p className="text-xs leading-relaxed">
                                  Only start times inside this clinic&apos;s working hours are shown. Past times and
                                  slots already reserved cannot be selected. Pick a free slot to continue.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="ml-auto h-8 gap-1.5 text-xs shrink-0"
                                >
                                  <CalendarClock className="h-3.5 w-3.5" />
                                  Hours &amp; slot grid
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[min(100vw-2rem,22rem)] max-h-80 overflow-y-auto" align="end">
                                <p className="text-sm font-semibold mb-2">Typical weekly hours</p>
                                <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                                  {(slotState.weeklySummary || []).map((line, i) => (
                                    <li key={i}>{line}</li>
                                  ))}
                                </ul>
                                <p className="text-sm font-semibold mb-2">
                                  Selected day{formData.appointmentDate ? ` (${formData.appointmentDate})` : ''}
                                </p>
                                {!formData.appointmentDate ? (
                                  <p className="text-xs text-muted-foreground">Choose a date to load slots.</p>
                                ) : slotState.loading ? (
                                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                                  </p>
                                ) : slotState.slots.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No slot grid for this day.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {slotState.slots.map((s) => (
                                      <span
                                        key={s.time}
                                        className={`text-xs rounded px-2 py-0.5 border ${
                                          s.available
                                            ? 'bg-emerald-500/10 border-emerald-700/25 text-emerald-900 dark:text-emerald-100'
                                            : 'bg-muted text-muted-foreground line-through opacity-80'
                                        }`}
                                      >
                                        {s.time}
                                        {!s.available
                                          ? s.reason === 'past'
                                            ? ' past'
                                            : s.reason === 'booked'
                                              ? ' taken'
                                              : ' unavailable'
                                          : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-3 border-t pt-2">
                                  Default visit length: {slotState.durationMinutes} min · IANA timezone:{' '}
                                  {slotState.timezone}
                                </p>
                              </PopoverContent>
                            </Popover>
                          </div>
                          {slotState.error ? (
                            <p className="text-sm text-destructive">{slotState.error}</p>
                          ) : null}
                          {!formData.appointmentDate ? (
                            <p className="text-xs text-muted-foreground">Select a date to load available times.</p>
                          ) : slotState.loading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading available times…
                            </div>
                          ) : (
                            <Select
                              value={formData.appointmentTime || undefined}
                              onValueChange={(v) => setFormData({ ...formData, appointmentTime: v })}
                              required
                              disabled={!slotState.slots.length}
                            >
                              <SelectTrigger id="book-time-slot">
                                <SelectValue
                                  placeholder={
                                    slotState.availableTimes.length === 0
                                      ? 'No openings this day — try another date'
                                      : 'Select a start time'
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {slotState.slots.map((s) => (
                                  <SelectItem key={s.time} value={s.time} disabled={!s.available}>
                                    {s.time}
                                    {!s.available
                                      ? s.reason === 'past'
                                        ? ' (past)'
                                        : s.reason === 'booked'
                                          ? ' (booked)'
                                          : ' (unavailable)'
                                      : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {formData.appointmentDate && !slotState.loading && !slotState.error ? (
                            <p className="text-xs text-muted-foreground">
                              {slotState.availableTimes.length} opening
                              {slotState.availableTimes.length === 1 ? '' : 's'} · outside these windows cannot be booked
                              here.
                            </p>
                          ) : null}
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

                      {schedulingUrl ? (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                          <p className="text-sm font-medium">Scheduling / video link</p>
                          <p className="text-xs text-muted-foreground">
                            Your provider uses an external calendar. You can open their scheduling page anytime.
                          </p>
                          <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                            <a href={schedulingUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                              Open scheduling link
                            </a>
                          </Button>
                        </div>
                      ) : null}

                      <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
                        <p className="font-medium">The selected Service and price</p>
                        {selectedCatalogService ? (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              Provider list: {selectedCatalogService.name}
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatCatalogLinePrice(selectedCatalogService)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Select a provider service to view the price.
                          </p>
                        )}
                      </div>
                    </>
                    </TooltipProvider>
                  )}
                </CardContent>
                <CardFooter className="bg-muted/10 border-t p-6 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      catalogLoading ||
                      specialties.length === 0 ||
                      filteredProviders.length === 0 ||
                      (Boolean(formData.appointmentDate) &&
                        (slotState.loading ||
                          slotState.error ||
                          slotState.availableTimes.length === 0))
                    }
                  >
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
                  Your appointment with {confirmation?.provider} has been scheduled.
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
                  {selectedCatalogService ? (
                    <div className="text-sm border-t pt-3">
                      <span className="text-muted-foreground">Provider catalog line: </span>
                      <span className="font-medium">
                        {selectedCatalogService.name} ({formatCatalogLinePrice(selectedCatalogService)})
                      </span>
                    </div>
                  ) : null}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground text-center">
                      Confirmation #:{' '}
                      <span className="font-mono font-medium text-foreground">
                        {confirmation?.confirmationNumber}
                      </span>
                    </p>
                  </div>
                  {schedulingUrl ? (
                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="gap-2 w-full" asChild>
                        <a href={schedulingUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          Provider scheduling link
                        </a>
                      </Button>
                    </div>
                  ) : null}
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
