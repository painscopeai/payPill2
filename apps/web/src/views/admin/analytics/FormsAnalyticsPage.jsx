
import React from 'react';
import { useAnalyticsSync } from '@/hooks/useAnalyticsSync';
import { KPICard } from '@/components/admin/charts/KPICard';
import { LineChart } from '@/components/admin/charts/LineChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function FormsAnalyticsPage() {
  const { data, isLoading, error } = useAnalyticsSync('/analytics/forms');

  if (isLoading && !data) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8 text-center text-destructive">Error loading analytics: {error}</div>;

  const kpis = data?.kpis || {};
  const trends = data?.trends || [];

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Forms Analytics</h1>
        <p className="text-muted-foreground">Assessment completion rates and user engagement.</p>
      </div>

      <div className="analytics-grid">
        <KPICard title="Total Responses" value={(kpis.total_responses || 0).toLocaleString()} icon={FileText} trend={15.4} />
        <KPICard title="Completion Rate" value={`${kpis.completion_rate || 0}%`} icon={CheckSquare} trend={2.1} />
        <KPICard title="Avg Completion Time" value={`${kpis.avg_completion_time || 0}m`} icon={Clock} trend={-1.5} />
        <KPICard title="Abandonment Rate" value={`${kpis.abandonment_rate || 0}%`} icon={AlertCircle} trend={-3.2} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Form Responses Trend</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={trends} series={[{ key: 'count', name: 'Responses' }]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

