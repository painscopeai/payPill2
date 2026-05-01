
import React from 'react';
import { useAnalyticsSync } from '@/hooks/useAnalyticsSync';
import { KPICard } from '@/components/admin/charts/KPICard';
import { LineChart } from '@/components/admin/charts/LineChart';
import { PieChart } from '@/components/admin/charts/PieChart';
import { BarChart } from '@/components/admin/charts/BarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CreditCard, TrendingUp, RefreshCcw } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function FinancialAnalyticsPage() {
  const { data, isLoading, error } = useAnalyticsSync('/analytics/financial');

  if (isLoading && !data) return <div className="flex h-96 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-8 text-center text-destructive">Error loading analytics: {error}</div>;

  const kpis = data?.kpis || {};
  const trends = data?.trends || [];
  const breakdown = data?.breakdown || {};

  const sourceData = Object.entries(breakdown.by_source || {}).map(([name, value]) => ({ name, value }));
  const methodData = Object.entries(breakdown.by_payment_method || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Financial Analytics</h1>
        <p className="text-muted-foreground">Revenue, transactions, and financial health metrics.</p>
      </div>

      <div className="analytics-grid">
        <KPICard title="Total Revenue" value={`$${(kpis.total_revenue || 0).toLocaleString()}`} icon={DollarSign} trend={8.4} />
        <KPICard title="Monthly Recurring (MRR)" value={`$${(kpis.mrr || 0).toLocaleString()}`} icon={TrendingUp} trend={5.2} />
        <KPICard title="Transaction Count" value={(kpis.transaction_count || 0).toLocaleString()} icon={CreditCard} trend={12.1} />
        <KPICard title="Refund Rate" value={`${kpis.refund_rate || 0}%`} icon={RefreshCcw} trend={-0.5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none admin-card-shadow">
          <CardHeader><CardTitle>Revenue Trend (12 Months)</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={trends} series={[{ key: 'value', name: 'Revenue ($)' }]} />
          </CardContent>
        </Card>

        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Revenue by Source</CardTitle></CardHeader>
          <CardContent>
            <PieChart data={sourceData} donut />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
          <CardContent>
            <BarChart data={methodData} series={[{ key: 'value', name: 'Transactions' }]} layout="vertical" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
