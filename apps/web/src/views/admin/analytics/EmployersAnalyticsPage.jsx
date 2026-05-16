
import React from 'react';
import { useAnalyticsSync } from '@/hooks/useAnalyticsSync';
import { KPICard } from '@/components/admin/charts/KPICard';
import { LineChart } from '@/components/admin/charts/LineChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, DollarSign, Activity } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function EmployersAnalyticsPage() {
  const { data, isLoading, error } = useAnalyticsSync('/analytics/employers');

  if (isLoading && !data) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8 text-center text-destructive">Error loading analytics: {error}</div>;

  const kpis = data?.kpis || {};
  const trends = data?.trends || [];

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Employer Analytics</h1>
        <p className="text-muted-foreground">B2B client metrics and employee engagement.</p>
      </div>

      <div className="analytics-grid">
        <KPICard title="Total Employers" value={kpis.total_employers || 0} icon={Building2} trend={4.1} />
        <KPICard title="Active Employers" value={kpis.active_employers || 0} icon={Activity} trend={3.8} />
        <KPICard title="Total Employees" value={kpis.total_employees || 0} icon={Users} trend={15.2} />
        <KPICard title="Employer MRR" value={`$${(kpis.mrr_from_employers || 0).toLocaleString()}`} icon={DollarSign} trend={9.5} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Employer Growth Trend</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={trends} series={[{ key: 'count', name: 'Employers' }]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

