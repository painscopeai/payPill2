import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Activity, HeartPulse, Pill, Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiServerClient from '@/lib/apiServerClient';

export default function HealthDashboardOverview() {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiServerClient.fetch('/patient-health-overview');
        const body = await res.json().catch(() => ({}));
        if (res.ok) setOverview(body);
      } catch {
        // Keep UI functional when endpoint is unavailable.
      }
    })();
  }, []);

  const vitalData = useMemo(() => {
    const rows = Array.isArray(overview?.healthRecords) ? overview.healthRecords : [];
    const recent = rows.slice(0, 7).reverse();
    if (!recent.length) {
      return [
        { name: 'Mon', value: 120 },
        { name: 'Tue', value: 118 },
        { name: 'Wed', value: 122 },
        { name: 'Thu', value: 119 },
        { name: 'Fri', value: 115 },
        { name: 'Sat', value: 117 },
        { name: 'Sun', value: 116 },
      ];
    }
    return recent.map((row, idx) => ({
      name: new Date(row.recordedAt || row.createdAt || Date.now()).toLocaleDateString(undefined, { weekday: 'short' }),
      value: Number(row.systolic || row.bpSystolic || row.value || 120) || 120,
      idx,
    }));
  }, [overview]);
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
            <div className="text-3xl font-bold text-foreground">12.4%</div>
            <p className="text-xs text-muted-foreground mt-1">Low risk category</p>
            <Progress value={12.4} className="h-2 mt-3 bg-muted" />
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <HeartPulse className="w-4 h-4 mr-2 text-destructive" /> Chronic Disease Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">8.2%</div>
            <p className="text-xs text-muted-foreground mt-1">-2.1% from last month</p>
            <Progress value={8.2} className="h-2 mt-3 bg-muted" />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Pill className="w-4 h-4 mr-2 text-secondary" /> Adherence Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">94%</div>
            <p className="text-xs text-muted-foreground mt-1">Excellent adherence</p>
            <Progress value={94} className="h-2 mt-3 bg-muted" />
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vitalData}>
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
            </div>
          </CardContent>
        </Card>

        {/* Action Items */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 text-accent" /> Preventive Care Gaps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground">Annual Flu Vaccine</span>
                <Badge variant="outline" className="text-accent border-accent">Due</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground">Lipid Panel</span>
                <Badge variant="outline" className="text-accent border-accent">Overdue</Badge>
              </div>
              <Button variant="link" className="w-full text-primary p-0 h-auto justify-start mt-2">
                Schedule Screenings <ArrowRight className="w-4 h-4 ml-1" />
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
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Dr. Sarah Williams (Cardiology)</span>
                <span className="text-xs text-muted-foreground">Oct 12, 2026 • 10:00 AM</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">LabCorp (Blood Draw)</span>
                <span className="text-xs text-muted-foreground">Oct 15, 2026 • 08:30 AM</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}