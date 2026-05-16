
import React from 'react';
import { useAnalyticsSync } from '@/hooks/useAnalyticsSync';
import { KPICard } from '@/components/admin/charts/KPICard';
import { LineChart } from '@/components/admin/charts/LineChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, CalendarCheck, Star, Activity } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ProvidersAnalyticsPage() {
  const { data, isLoading, error } = useAnalyticsSync('/analytics/providers');

  if (isLoading && !data) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8 text-center text-destructive">Error loading analytics: {error}</div>;

  const kpis = data?.kpis || {};
  const trends = data?.trends || [];

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Provider Analytics</h1>
        <p className="text-muted-foreground">Healthcare provider network performance.</p>
      </div>

      <div className="analytics-grid">
        <KPICard title="Total Providers" value={kpis.total_providers || 0} icon={Stethoscope} trend={6.5} />
        <KPICard title="Active Providers" value={kpis.active_providers || 0} icon={Activity} trend={5.8} />
        <KPICard title="Total Appointments" value={kpis.total_appointments || 0} icon={CalendarCheck} trend={22.4} />
        <KPICard title="Avg Rating" value={kpis.avg_rating || 0} icon={Star} trend={0.2} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Provider Network Growth</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={trends} series={[{ key: 'count', name: 'Providers' }]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

