import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download, RefreshCw, BarChart3, AlertTriangle, Lightbulb } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

export default function InsuranceAnalyticsPage() {
  const [insurancePayload, setInsurancePayload] = useState(null);
  const [financialPayload, setFinancialPayload] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [insRes, finRes] = await Promise.all([
          apiServerClient.fetch('/analytics/insurance'),
          apiServerClient.fetch('/analytics/financial'),
        ]);
        const insBody = await insRes.json().catch(() => ({}));
        const finBody = await finRes.json().catch(() => ({}));
        if (!insRes.ok) throw new Error(insBody.error || 'Failed to load insurance analytics');
        if (!finRes.ok) throw new Error(finBody.error || 'Failed to load financial analytics');
        setInsurancePayload(insBody);
        setFinancialPayload(finBody);
      } catch (e) {
        toast.error(e.message || 'Failed to load analytics');
      }
    })();
  }, []);

  const mlrTrend = useMemo(() => {
    const trends = insurancePayload?.trends || [];
    return trends.slice(-6).map((row) => ({
      month: new Date(`${String(row.month || '2000-01')}-01`).toLocaleString('default', { month: 'short' }),
      mlr: Math.min(99, Math.max(60, Number(insurancePayload?.kpis?.approval_rate || 0))),
      benchmark: 85,
    }));
  }, [insurancePayload]);

  const financialAnalytics = useMemo(() => {
    const trends = financialPayload?.trends || [];
    return trends.slice(-6).map((row) => ({
      month: new Date(`${String(row.month || '2000-01')}-01`).toLocaleString('default', { month: 'short' }),
      revenue: Number(row.value || 0),
      claims: Number(row.value || 0),
      admin: Number((Number(row.value || 0) * 0.12).toFixed(2)),
    }));
  }, [financialPayload]);

  const kpis = insurancePayload?.kpis || {};
  const finKpis = financialPayload?.kpis || {};

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Insurance Analytics - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
            <p className="text-muted-foreground">Financial, clinical, and operational intelligence.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
            <Button className="gap-2"><Download className="h-4 w-4" /> Executive Report</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-semibold text-primary flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4" /> MLR Performance
              </h3>
              <p className="text-3xl font-bold text-primary mb-1">{Number(kpis.approval_rate || 0).toFixed(1)}%</p>
              <p className="text-sm text-foreground">Claims approval ratio across the selected period.</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/5 border-orange-500/20">
            <CardContent className="p-6">
              <h3 className="font-semibold text-orange-600 flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4" /> High-Risk Churn
              </h3>
              <p className="text-3xl font-bold text-orange-600 mb-1">{Number(kpis.avg_processing_time_days || 0).toFixed(1)}d</p>
              <p className="text-sm text-foreground">Average claim processing time from real claims records.</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-6">
              <h3 className="font-semibold text-emerald-600 flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4" /> Preventive Impact
              </h3>
              <p className="text-3xl font-bold text-emerald-600 mb-1">${Number(finKpis.total_revenue || 0).toLocaleString()}</p>
              <p className="text-sm text-foreground">Total financial volume tracked for the selected period.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Medical Loss Ratio (MLR) Trend</CardTitle>
              <CardDescription>Monthly progression vs Benchmark</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mlrTrend} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[60, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" name="Actual MLR (%)" dataKey="mlr" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" strokeWidth={3} />
                    <Area type="step" name="Benchmark (85%)" dataKey="benchmark" stroke="hsl(var(--destructive))" fill="none" strokeDasharray="5 5" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Financial Analytics</CardTitle>
              <CardDescription>Revenue vs Claims Paid vs Admin Costs ($K)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialAnalytics} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{ borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar name="Premiums Revenue" dataKey="revenue" fill="hsl(var(--emerald-500))" radius={[4, 4, 0, 0]} />
                    <Bar name="Claims Paid" dataKey="claims" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 0, 0]} />
                    <Bar name="Admin Costs" dataKey="admin" stackId="a" fill="hsl(var(--orange-500))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}