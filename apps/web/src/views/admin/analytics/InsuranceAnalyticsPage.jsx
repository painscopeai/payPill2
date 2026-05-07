
import React from 'react';
import { useAnalyticsSync } from '@/hooks/useAnalyticsSync';
import { KPICard } from '@/components/admin/charts/KPICard';
import { LineChart } from '@/components/admin/charts/LineChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, FileText, CheckCircle, Clock } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function InsuranceAnalyticsPage() {
  const { data, isLoading, error } = useAnalyticsSync('/analytics/insurance');

  if (isLoading && !data) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8 text-center text-destructive">Error loading analytics: {error}</div>;

  const kpis = data?.kpis || {};
  const trends = data?.trends || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Insurance Analytics</h1>
        <p className="text-muted-foreground">Partner performance and claims processing metrics.</p>
      </div>

      <div className="analytics-grid">
        <KPICard title="Total Partners" value={kpis.total_partners || 0} icon={ShieldCheck} trend={2.0} />
        <KPICard title="Total Claims" value={kpis.total_claims || 0} icon={FileText} trend={18.5} />
        <KPICard title="Approval Rate" value={`${kpis.approval_rate || 0}%`} icon={CheckCircle} trend={1.2} />
        <KPICard title="Avg Processing Time" value={`${kpis.avg_processing_time_days || 0}d`} icon={Clock} trend={-5.4} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Claims Volume Trend</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={trends} series={[{ key: 'value', name: 'Claims' }]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
