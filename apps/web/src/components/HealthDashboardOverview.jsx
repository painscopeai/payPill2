import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Activity, HeartPulse, Pill, Calendar, FlaskConical, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext';
import {
	appointmentHeadline,
	formatAppointmentSubtitle,
	normalizeAppointmentList,
	selectUpcomingAppointments,
} from '@/lib/patientAppointmentUtils';

const keyToMetricMap = {
  systolic: /systolic|bp systolic|blood pressure systolic/i,
  diastolic: /diastolic|bp diastolic|blood pressure diastolic/i,
  heartRate: /heart rate|pulse/i,
  bmi: /^bmi$|body mass index/i,
};

function numericFromUnknown(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const num = Number(match[0]);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function extractMetricFromBodyMetrics(bodyMetrics = {}, matcher) {
  for (const [key, value] of Object.entries(bodyMetrics)) {
    if (!matcher.test(key)) continue;
    const num = numericFromUnknown(value);
    if (num != null) return num;
  }
  return null;
}

function parseVitalsFromRecord(record = {}) {
  const source = `${record.title || ''} ${record.notes || ''}`;
  const systolic = numericFromUnknown(source.match(/(?:bp|blood pressure)?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i)?.[1]);
  const diastolic = numericFromUnknown(source.match(/(?:bp|blood pressure)?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i)?.[2]);
  const hr = numericFromUnknown(source.match(/(?:hr|heart rate|pulse)[:\s]+(\d{2,3})/i)?.[1]);

  const when = record.recordDate || record.createdAt || record.updatedAt || null;
  if (systolic == null && diastolic == null && hr == null) return null;
  return {
    when,
    systolic,
    diastolic,
    heartRate: hr,
  };
}

function computeAnalytics(overview) {
  const bodyMetrics = overview?.bodyMetrics || {};
  const conditions = overview?.conditions?.flatLabels || [];
  const healthRecords = Array.isArray(overview?.healthRecords) ? overview.healthRecords : [];

  const systolicBase = extractMetricFromBodyMetrics(bodyMetrics, keyToMetricMap.systolic);
  const diastolicBase = extractMetricFromBodyMetrics(bodyMetrics, keyToMetricMap.diastolic);
  const heartRateBase = extractMetricFromBodyMetrics(bodyMetrics, keyToMetricMap.heartRate);
  const bmi = extractMetricFromBodyMetrics(bodyMetrics, keyToMetricMap.bmi);

  const vitals = healthRecords
    .map(parseVitalsFromRecord)
    .filter(Boolean)
    .sort((a, b) => new Date(a.when || 0).getTime() - new Date(b.when || 0).getTime());

  const vitalsForChart = vitals.slice(-7).map((row) => ({
    name: new Date(row.when || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: row.systolic ?? systolicBase ?? null,
  })).filter((row) => row.value != null);

  const latest = vitals[vitals.length - 1] || null;
  const prev = vitals.length > 1 ? vitals[vitals.length - 2] : null;

  const systolicNow = latest?.systolic ?? systolicBase ?? 120;
  const diastolicNow = latest?.diastolic ?? diastolicBase ?? 80;
  const hrNow = latest?.heartRate ?? heartRateBase ?? 72;

  const conditionCount = conditions.length;
  const systolicPenalty = Math.max(0, systolicNow - 120) * 0.4;
  const diastolicPenalty = Math.max(0, diastolicNow - 80) * 0.3;
  const hrPenalty = Math.max(0, hrNow - 90) * 0.2;
  const bmiPenalty = bmi != null ? Math.max(0, bmi - 25) * 0.8 : 0;
  const conditionPenalty = conditionCount * 4;

  const chronicRisk = Math.max(
    1,
    Math.min(100, Number((systolicPenalty + diastolicPenalty + hrPenalty + bmiPenalty + conditionPenalty).toFixed(1))),
  );
  const relativeRisk = Math.max(1, Math.min(100, Number((chronicRisk * 0.8).toFixed(1))));
  const adherence = Math.max(5, Math.min(100, Number((100 - chronicRisk * 0.55).toFixed(0))));

  const previousRisk = prev
    ? Math.max(
        1,
        Math.min(100, Number((((Math.max(0, (prev.systolic ?? systolicNow) - 120) * 0.4) + (Math.max(0, (prev.diastolic ?? diastolicNow) - 80) * 0.3) + conditionPenalty)).toFixed(1))),
      )
    : chronicRisk;
  const riskDelta = Number((chronicRisk - previousRisk).toFixed(1));

  return {
    vitalsForChart,
    relativeRisk,
    chronicRisk,
    adherence,
    riskDelta,
    conditionCount,
  };
}

export default function HealthDashboardOverview() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [overview, setOverview] = useState(null);
  const [labInvestigations, setLabInvestigations] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [sidePanelLoading, setSidePanelLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!currentUser?.id) {
        if (!cancelled) {
          setOverview(null);
          setLabInvestigations([]);
          setAppointments([]);
          setSidePanelLoading(false);
        }
        return;
      }

      setSidePanelLoading(true);

      try {
        const [overviewRes, labRes, aptRes] = await Promise.all([
          apiServerClient.fetch('/patient-health-overview?includeRaw=1'),
          apiServerClient.fetch('/patient/upcoming-laboratory-investigations'),
          apiServerClient.fetch(`/appointments?user_id=${encodeURIComponent(currentUser.id)}`),
        ]);

        if (cancelled) return;

        const overviewBody = overviewRes.ok ? await overviewRes.json().catch(() => ({})) : null;
        setOverview(overviewBody);

        if (labRes.ok) {
          const labBody = await labRes.json().catch(() => ({}));
          setLabInvestigations(Array.isArray(labBody.items) ? labBody.items : []);
        } else {
          setLabInvestigations([]);
        }

        if (aptRes.ok) {
          const aptBody = await aptRes.json().catch(() => []);
          setAppointments(selectUpcomingAppointments(normalizeAppointmentList(aptBody), 2));
        } else {
          setAppointments([]);
        }

      } catch {
        if (!cancelled) {
          setLabInvestigations([]);
          setAppointments([]);
        }
      } finally {
        if (!cancelled) setSidePanelLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const analytics = useMemo(() => computeAnalytics(overview), [overview]);
  return (
    <div className="space-y-8">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Activity className="w-4 h-4 mr-2 text-primary" /> Relative Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{analytics.relativeRisk}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.relativeRisk <= 25 ? 'Low risk category' : analytics.relativeRisk <= 60 ? 'Moderate risk category' : 'Elevated risk category'}
            </p>
            <Progress value={analytics.relativeRisk} className="h-2 mt-3 bg-muted" />
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <HeartPulse className="w-4 h-4 mr-2 text-destructive" /> Chronic Disease Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{analytics.chronicRisk}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.riskDelta === 0 ? 'No change vs prior reading' : `${analytics.riskDelta > 0 ? '+' : ''}${analytics.riskDelta}% vs prior reading`}
            </p>
            <Progress value={analytics.chronicRisk} className="h-2 mt-3 bg-muted" />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Pill className="w-4 h-4 mr-2 text-secondary" /> Adherence Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{analytics.adherence}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Derived from health profile and records
            </p>
            <Progress value={analytics.adherence} className="h-2 mt-3 bg-muted" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Vital Status Trend (Systolic BP)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {analytics.vitalsForChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.vitalsForChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No vitals found in your health records yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Items */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground flex items-center">
                <FlaskConical className="w-4 h-4 mr-2 text-info" /> Upcoming Laboratory Investigation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sidePanelLoading ? (
                <>
                  <div className="h-5 bg-muted animate-pulse rounded" />
                  <div className="h-5 bg-muted animate-pulse rounded" />
                </>
              ) : labInvestigations.length > 0 ? (
                labInvestigations.map((item) => (
                  <div key={item.id} className="flex justify-between items-center gap-3">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <Badge variant="outline" className="text-info border-info shrink-0">
                      {item.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming laboratory investigations.</p>
              )}
              <Button
                type="button"
                variant="link"
                className="w-full text-primary p-0 h-auto justify-start mt-2"
                onClick={() =>
                  navigate(
                    labInvestigations.some((i) => i.status === 'Due')
                      ? '/patient/consultations'
                      : '/patient/booking',
                  )
                }
              >
                {labInvestigations.some((i) => i.status === 'Due')
                  ? 'View lab orders'
                  : 'Book laboratory appointment'}{' '}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-primary" /> Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sidePanelLoading ? (
                <>
                  <div className="h-10 bg-muted animate-pulse rounded" />
                  <div className="h-10 bg-muted animate-pulse rounded" />
                </>
              ) : appointments.length > 0 ? (
                appointments.map((apt) => (
                  <div key={apt.id} className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{appointmentHeadline(apt)}</span>
                    <span className="text-xs text-muted-foreground">{formatAppointmentSubtitle(apt)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming appointments scheduled.</p>
              )}
              {!sidePanelLoading && appointments.length > 0 ? (
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-primary p-0 h-auto justify-start"
                  onClick={() => navigate('/patient/appointments')}
                >
                  View all appointments <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}