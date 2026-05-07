import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

export default function ProviderAnalyticsPage() {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiServerClient.fetch('/analytics/providers');
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Failed to load provider analytics');
        setPayload(body);
      } catch (e) {
        toast.error(e.message || 'Failed to load provider analytics');
      }
    })();
  }, []);

  const chartData = useMemo(() => {
    const trends = payload?.trends || [];
    if (!trends.length) return [];
    return trends.slice(-6).map((row) => ({
      name: new Date(`${String(row.month || '2000-01')}-01`).toLocaleDateString(undefined, { month: 'short' }),
      value: Number(row.count || 0),
    }));
  }, [payload]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Analytics - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Population Health Analytics</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Medication Adherence Trends</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}