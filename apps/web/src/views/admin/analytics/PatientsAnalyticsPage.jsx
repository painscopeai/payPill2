
import React from 'react';
import { useAnalyticsSync } from '@/hooks/useAnalyticsSync';
import { KPICard } from '@/components/admin/charts/KPICard';
import { LineChart } from '@/components/admin/charts/LineChart';
import { PieChart } from '@/components/admin/charts/PieChart';
import { BarChart } from '@/components/admin/charts/BarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Activity, HeartPulse } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function PatientsAnalyticsPage() {
  const { data, isLoading, error } = useAnalyticsSync('/analytics/patients');

  if (isLoading && !data) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8 text-center text-destructive">Error loading analytics: {error}</div>;

  const kpis = data?.kpis || {};
  const trends = data?.trends || [];
  const breakdown = data?.breakdown || {};

  // Format breakdown data for charts
  const genderData = Object.entries(breakdown.by_gender || {}).map(([name, value]) => ({ name, value }));
  const ageData = Object.entries(breakdown.by_age_group || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Patient Analytics</h1>
        <p className="text-muted-foreground">Comprehensive overview of patient demographics and engagement.</p>
      </div>

      <div className="analytics-grid">
        <KPICard title="Total Patients" value={kpis.total_patients || 0} icon={Users} trend={5.2} />
        <KPICard title="Active Patients" value={kpis.active_patients || 0} icon={Activity} trend={2.1} />
        <KPICard title="New This Month" value={kpis.new_this_month || 0} icon={UserPlus} trend={12.5} />
        <KPICard title="Retention Rate" value={`${kpis.retention_rate || 0}%`} icon={HeartPulse} trend={-1.2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none admin-card-shadow">
          <CardHeader><CardTitle>Patient Growth Trend</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={trends} series={[{ key: 'count', name: 'Patients' }]} />
          </CardContent>
        </Card>

        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Gender Distribution</CardTitle></CardHeader>
          <CardContent>
            <PieChart data={genderData} donut />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Age Demographics</CardTitle></CardHeader>
          <CardContent>
            <BarChart data={ageData} series={[{ key: 'value', name: 'Patients' }]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

