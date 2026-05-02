import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, MapPin, Video, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function formatDisplayTime(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const t = raw.trim();
  if (/am|pm/i.test(t)) return t;
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  if (Number.isNaN(h)) return t;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function parseLocalDay(dateStr) {
  if (!dateStr) return null;
  const [y, mo, d] = dateStr.split('-').map(Number);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
}

function startOfTodayLocal() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function isTelehealthApt(apt) {
  const loc = (apt.location || '').toLowerCase();
  return loc.includes('online') || loc.includes('video') || loc.includes('telehealth');
}

function statusLabel(status) {
  const s = (status || '').toLowerCase();
  if (s === 'scheduled') return 'Pending';
  if (s === 'confirmed') return 'Confirmed';
  if (s === 'completed') return 'Completed';
  if (s === 'cancelled') return 'Cancelled';
  return status || 'Scheduled';
}

export default function PatientAppointmentsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    if (!currentUser?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiServerClient.fetch(
        `/appointments?user_id=${encodeURIComponent(currentUser.id)}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load appointments');
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const { upcoming, past } = useMemo(() => {
    const today = startOfTodayLocal();
    const up = [];
    const pa = [];
    for (const apt of rows) {
      const day = parseLocalDay(apt.appointment_date);
      const pastDay = day && day < today;
      const st = (apt.status || '').toLowerCase();
      const isCancelled = st === 'cancelled';
      const isCompleted = st === 'completed';
      if (isCancelled) {
        pa.push(apt);
        continue;
      }
      if (isCompleted || pastDay) {
        pa.push(apt);
      } else {
        up.push(apt);
      }
    }
    up.sort((a, b) => {
      const da = a.appointment_date || '';
      const db = b.appointment_date || '';
      if (da !== db) return da.localeCompare(db);
      return (a.appointment_time || '').localeCompare(b.appointment_time || '');
    });
    pa.sort((a, b) => {
      const da = a.appointment_date || '';
      const db = b.appointment_date || '';
      if (da !== db) return db.localeCompare(da);
      return (b.appointment_time || '').localeCompare(a.appointment_time || '');
    });
    return { upcoming: up, past: pa };
  }, [rows]);

  const providerDisplayName = (apt) => {
    const d = apt.provider_details;
    if (d?.provider_name || d?.name) return d.provider_name || d.name;
    return apt.provider_name || 'Provider';
  };

  const specialtyDisplay = (apt) => {
    const d = apt.provider_details;
    return d?.specialty || d?.type || apt.type || '';
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Helmet>
        <title>My Appointments - PayPill</title>
      </Helmet>

      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Manage your upcoming visits and view past history.</p>
        </div>
        <Button onClick={() => navigate('/patient/booking')} className="gap-2">
          <Plus className="h-4 w-4" /> Book New Appointment
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Loading appointments…
        </div>
      ) : (
        <Tabs defaultValue="upcoming" className="w-full flex-1">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past Visits ({past.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No upcoming appointments.</p>
            ) : (
              upcoming.map((apt) => {
                const tele = isTelehealthApt(apt);
                const st = statusLabel(apt.status);
                const badgeClass =
                  st === 'Confirmed'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-orange-500/10 text-orange-600 border-orange-500/20';
                return (
                  <Card key={apt.id} className="shadow-sm border-border/50">
                    <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                      <div className="flex flex-col items-center justify-center bg-primary/5 rounded-xl p-4 min-w-[100px] border border-primary/10">
                        <span className="text-sm font-bold text-primary uppercase">
                          {apt.appointment_date
                            ? new Date(apt.appointment_date + 'T12:00:00').toLocaleString('default', {
                                month: 'short',
                              })
                            : '—'}
                        </span>
                        <span className="text-3xl font-bold text-foreground">
                          {apt.appointment_date
                            ? parseLocalDay(apt.appointment_date)?.getDate() || '—'
                            : '—'}
                        </span>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold">{providerDisplayName(apt)}</h3>
                          <Badge variant="outline" className={badgeClass}>
                            {st}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{specialtyDisplay(apt)}</p>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" /> {formatDisplayTime(apt.appointment_time)}
                          </div>
                          <div className="flex items-center gap-1">
                            {tele ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                            {apt.location || (tele ? 'Online visit' : '—')}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <Button variant="outline" type="button" disabled>
                          Reschedule
                        </Button>
                        {tele ? (
                          <Button type="button" disabled>
                            Join Call
                          </Button>
                        ) : (
                          <Button type="button" disabled>
                            Get Directions
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No past visits yet.</p>
            ) : (
              past.map((apt) => (
                <Card key={apt.id} className="shadow-sm border-border/50 opacity-90">
                  <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="flex flex-col items-center justify-center bg-muted rounded-xl p-4 min-w-[100px]">
                      <span className="text-sm font-bold text-muted-foreground uppercase">
                        {apt.appointment_date
                          ? new Date(apt.appointment_date + 'T12:00:00').toLocaleString('default', {
                              month: 'short',
                            })
                          : '—'}
                      </span>
                      <span className="text-3xl font-bold text-muted-foreground">
                        {apt.appointment_date
                          ? parseLocalDay(apt.appointment_date)?.getDate() || '—'
                          : '—'}
                      </span>
                    </div>

                    <div className="flex-1 space-y-1">
                      <h3 className="text-lg font-bold text-muted-foreground">{providerDisplayName(apt)}</h3>
                      <p className="text-sm text-muted-foreground">{specialtyDisplay(apt)}</p>
                      <p className="text-sm text-muted-foreground pt-1">
                        {apt.appointment_date} at {formatDisplayTime(apt.appointment_time)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" type="button" disabled>
                        View Notes
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => navigate('/patient/booking')}
                      >
                        Book Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
