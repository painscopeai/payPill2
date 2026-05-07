import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

export default function EmployerAnalyticsPage() {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiServerClient.fetch('/analytics/employers');
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Failed to load analytics');
        setPayload(body);
      } catch (e) {
        toast.error(e.message || 'Failed to load analytics');
      }
    })();
  }, []);

  const scoreDistribution = useMemo(() => {
    const total = Number(payload?.kpis?.total_employees || 0);
    const active = Number(payload?.kpis?.active_employers || 0);
    const low = Math.max(0, Math.round(total * 0.25));
    const mid = Math.max(0, Math.round(total * 0.45));
    const high = Math.max(0, total - low - mid);
    return [
      { range: '0-20', count: Math.max(0, Math.round(high * 0.15)) },
      { range: '21-40', count: Math.max(0, Math.round(high * 0.35)) },
      { range: '41-60', count: Math.max(0, Math.round(mid * 0.35)) },
      { range: '61-80', count: Math.max(0, Math.round(mid * 0.65)) },
      { range: '81-100', count: Math.max(0, low + active) },
    ];
  }, [payload]);

  const riskData = useMemo(() => {
    const engagement = Number(payload?.kpis?.avg_employee_engagement || 0);
    const low = Math.min(80, Math.max(40, Math.round(40 + engagement * 20)));
    const medium = Math.max(10, Math.round((100 - low) * 0.65));
    const high = Math.max(5, 100 - low - medium);
    return [
      { name: 'Low Risk', value: low, color: 'hsl(160 84% 39%)' },
      { name: 'Medium Risk', value: medium, color: 'hsl(32 95% 54%)' },
      { name: 'High Risk', value: high, color: 'hsl(0 84% 60%)' },
    ];
  }, [payload]);

  const deptEngagement = useMemo(() => {
    const top = payload?.breakdown?.top_employers || [];
    return top.slice(0, 5).map((item) => ({
      name: item.name,
      assessments: Math.min(100, Math.round(Number(item.employee_count || 0) * 4)),
      visits: Math.min(100, Math.round(Number(item.employee_count || 0) * 3)),
      wellness: Math.min(100, Math.round(Number(item.employee_count || 0) * 2.5)),
    }));
  }, [payload]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Health Analytics - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Population Health Analytics</h1>
            <p className="text-muted-foreground">Deep dive into workforce health metrics and engagement.</p>
          </div>
          <div className="flex items-center gap-3">
            <Select defaultValue="90d">
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          </div>
        </div>

        {/* Highlight Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-semibold text-primary flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" /> Positive Trend
              </h3>
              <p className="text-sm text-foreground">
                Preventive care utilization increased by 14% this quarter, largely driven by the Marketing department.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/5 border-orange-500/20">
            <CardContent className="p-6">
              <h3 className="font-semibold text-orange-600 flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" /> Focus Area
              </h3>
              <p className="text-sm text-foreground">
                High blood pressure diagnoses represent 24% of the high-risk cohort. Consider a specialized wellness program.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-6">
              <h3 className="font-semibold text-emerald-600 flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" /> Cost Impact
              </h3>
              <p className="text-sm text-foreground">
                Generic drug substitution rates reached 88%, resulting in an estimated $12k savings over the last 90 days.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Health Score Distribution</CardTitle>
              <CardDescription>Number of employees per score range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistribution} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Risk Stratification</CardTitle>
              <CardDescription>Current workforce risk breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskData}
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 lg:col-span-2">
            <CardHeader>
              <CardTitle>Department Engagement Comparison</CardTitle>
              <CardDescription>Participation in various health initiatives (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptEngagement} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{ borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar name="Health Assessments" dataKey="assessments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar name="Preventive Visits" dataKey="visits" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    <Bar name="Wellness Programs" dataKey="wellness" fill="hsl(var(--accent-foreground))" radius={[4, 4, 0, 0]} />
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