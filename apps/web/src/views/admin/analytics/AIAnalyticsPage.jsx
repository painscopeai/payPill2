
import React from 'react';
import { useAnalyticsSync } from '@/hooks/useAnalyticsSync';
import { KPICard } from '@/components/admin/charts/KPICard';
import { LineChart } from '@/components/admin/charts/LineChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, CheckCircle, Clock, DollarSign } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AIAnalyticsPage() {
  const { data, isLoading, error } = useAnalyticsSync('/analytics/ai');

  if (isLoading && !data) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8 text-center text-destructive">Error loading analytics: {error}</div>;

  const kpis = data?.kpis || {};
  const trends = data?.trends || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">AI Usage Analytics</h1>
        <p className="text-muted-foreground">Monitor LLM performance, token usage, and costs.</p>
      </div>

      <div className="analytics-grid">
        <KPICard title="Total Requests" value={(kpis.total_requests || 0).toLocaleString()} icon={Brain} trend={34.2} />
        <KPICard title="Success Rate" value={`${kpis.success_rate || 0}%`} icon={CheckCircle} trend={0.5} />
        <KPICard title="Avg Processing Time" value={`${kpis.avg_processing_time || 0}ms`} icon={Clock} trend={-12.4} />
        <KPICard title="Total Cost" value={`$${(kpis.total_cost || 0).toFixed(2)}`} icon={DollarSign} trend={28.1} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>AI Request Volume</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={trends} series={[{ key: 'count', name: 'Requests' }]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
