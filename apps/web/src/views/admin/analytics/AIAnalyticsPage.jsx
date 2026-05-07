import React from 'react';
import { useAnalyticsSync } from '@/hooks/useAnalyticsSync';
import { KPICard } from '@/components/admin/charts/KPICard';
import { LineChart } from '@/components/admin/charts/LineChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, CheckCircle, Clock, FileText, Users } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AIAnalyticsPage() {
  const { data, isLoading, error } = useAnalyticsSync('/analytics/ai');

  if (isLoading && !data) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8 text-center text-destructive">Error loading analytics: {error}</div>;

  const kpis = data?.kpis || {};
  const trends = data?.trends || [];
  const reportsBySource = data?.breakdown?.by_report_source || {};
  const byModel = data?.breakdown?.by_model || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">AI Usage Analytics</h1>
        <p className="text-muted-foreground">
          Health Action Plan generation and patient AI assistance volume — sourced from <code className="text-xs">patient_ai_reports</code> and <code className="text-xs">ai_logs</code>.
        </p>
      </div>

      <div className="analytics-grid">
        <KPICard title="Health Action Reports" value={(kpis.health_reports || 0).toLocaleString()} icon={FileText} />
        <KPICard title="Patients With Reports" value={(kpis.distinct_report_patients || 0).toLocaleString()} icon={Users} />
        <KPICard title="AI Requests (logs)" value={(kpis.ai_log_requests || 0).toLocaleString()} icon={Brain} />
        <KPICard title="Success Rate" value={`${kpis.success_rate || 0}%`} icon={CheckCircle} />
        <KPICard title="Avg Processing" value={`${kpis.avg_processing_time_ms || 0}ms`} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-none admin-card-shadow lg:col-span-2">
          <CardHeader><CardTitle>AI Usage Volume (12 months)</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={trends} series={[{ key: 'count', name: 'Requests + Reports' }]} />
          </CardContent>
        </Card>
        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Reports by source</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(reportsBySource).length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports in range.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {Object.entries(reportsBySource)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between">
                      <span>{k}</span>
                      <span className="font-medium">{v}</span>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none admin-card-shadow">
        <CardHeader><CardTitle>Usage by model / category</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(byModel).length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI usage in selected range.</p>
          ) : (
            <ul className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(byModel)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between border rounded-md p-2 bg-muted/20">
                    <span>{k}</span>
                    <span className="font-medium">{v}</span>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
