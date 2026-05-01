
import React from 'react';
import { useAnalyticsSync } from '@/hooks/useAnalyticsSync';
import { KPICard } from '@/components/admin/charts/KPICard';
import { LineChart } from '@/components/admin/charts/LineChart';
import { PieChart } from '@/components/admin/charts/PieChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, DollarSign, Users, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SubscriptionsAnalyticsPage() {
  const { data, isLoading, error } = useAnalyticsSync('/analytics/subscriptions');

  if (isLoading && !data) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8 text-center text-destructive">Error loading analytics: {error}</div>;

  const kpis = data?.kpis || {};
  const trends = data?.trends || [];
  const breakdown = data?.breakdown || {};

  const statusData = Object.entries(breakdown.by_status || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Subscription Analytics</h1>
        <p className="text-muted-foreground">Track MRR, churn, and overall subscription health.</p>
      </div>

      <div className="analytics-grid">
        <KPICard title="Active Subscriptions" value={kpis.active_subscriptions || 0} icon={Activity} trend={5.2} />
        <KPICard title="MRR" value={`$${(kpis.mrr || 0).toLocaleString()}`} icon={DollarSign} trend={8.4} />
        <KPICard title="ARR" value={`$${(kpis.arr || 0).toLocaleString()}`} icon={DollarSign} trend={8.4} />
        <KPICard title="Churn Rate" value={`${kpis.churn_rate || 0}%`} icon={AlertTriangle} trend={-2.1} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Subscription Growth</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={trends} series={[{ key: 'count', name: 'Active Subs' }]} />
          </CardContent>
        </Card>

        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <PieChart data={statusData} donut />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
