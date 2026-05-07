
import React, { useState, useEffect } from 'react';
import { adminListRecent } from '@/lib/adminSupabaseList.js';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Building2, ShieldCheck, Activity,
  CreditCard, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight,
  RefreshCw, Download, Clock
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    patients: 0, employers: 0, insurance: 0, providers: 0,
    transactions: 0, mrr: 0, arr: 0
  });
  const [activities, setActivities] = useState([]);
  const [trends, setTrends] = useState({
    patients: 0,
    employers: 0,
    insurance: 0,
    providers: 0,
    transactions: 0,
    mrr: 0,
    arr: 0,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);

  const asPct = (value) => Number.isFinite(Number(value)) ? Number(value.toFixed(1)) : 0;
  const pctChange = (current, previous) => {
    const c = Number(current || 0);
    const p = Number(previous || 0);
    if (p <= 0) return c > 0 ? 100 : 0;
    return ((c - p) / p) * 100;
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const days = Number(dateRange || 30);
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - days);
      const prevEnd = new Date(start);
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - days);
      const currentQs = `startDate=${start.toISOString()}&endDate=${now.toISOString()}`;
      const prevQs = `startDate=${prevStart.toISOString()}&endDate=${prevEnd.toISOString()}`;

      const fetchJson = async (path) => {
        const res = await apiServerClient.fetch(path);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Failed ${path}`);
        return body;
      };

      const [
        summary,
        patientsNow,
        employersNow,
        insuranceNow,
        providersNow,
        financialNow,
        patientsPrev,
        employersPrev,
        insurancePrev,
        providersPrev,
        financialPrev,
        activitiesRows,
      ] = await Promise.all([
        fetchJson('/admin/dashboard/summary'),
        fetchJson(`/analytics/patients?${currentQs}`),
        fetchJson(`/analytics/employers?${currentQs}`),
        fetchJson(`/analytics/insurance?${currentQs}`),
        fetchJson(`/analytics/providers?${currentQs}`),
        fetchJson(`/analytics/financial?${currentQs}`),
        fetchJson(`/analytics/patients?${prevQs}`),
        fetchJson(`/analytics/employers?${prevQs}`),
        fetchJson(`/analytics/insurance?${prevQs}`),
        fetchJson(`/analytics/providers?${prevQs}`),
        fetchJson(`/analytics/financial?${prevQs}`),
        adminListRecent('audit_logs', 10),
      ]);

      setStats({
        patients: Number(summary?.patients || 0),
        employers: Number(summary?.employers || 0),
        insurance: Number(summary?.insurance || 0),
        providers: Number(summary?.providers || 0),
        transactions: Number(summary?.transactions || 0),
        mrr: Number(financialNow?.kpis?.mrr || 0),
        arr: Number(financialNow?.kpis?.mrr || 0) * 12,
      });
      setTrends({
        patients: asPct(pctChange(patientsNow?.kpis?.total_patients, patientsPrev?.kpis?.total_patients)),
        employers: asPct(pctChange(employersNow?.kpis?.total_employers, employersPrev?.kpis?.total_employers)),
        insurance: asPct(pctChange(insuranceNow?.kpis?.total_partners, insurancePrev?.kpis?.total_partners)),
        providers: asPct(pctChange(providersNow?.kpis?.total_providers, providersPrev?.kpis?.total_providers)),
        transactions: asPct(pctChange(financialNow?.kpis?.transaction_count, financialPrev?.kpis?.transaction_count)),
        mrr: asPct(pctChange(financialNow?.kpis?.mrr, financialPrev?.kpis?.mrr)),
        arr: asPct(
          pctChange(
            Number(financialNow?.kpis?.mrr || 0) * 12,
            Number(financialPrev?.kpis?.mrr || 0) * 12,
          ),
        ),
      });
      setRevenueData(
        (financialNow?.trends || []).slice(-6).map((row) => ({
          name: new Date(`${String(row.month || '2000-01')}-01`).toLocaleDateString(undefined, { month: 'short' }),
          revenue: Number(row.value || 0),
        })),
      );
      const toMap = (rows) =>
        Object.fromEntries(
          (rows || []).map((r) => [String(r.month || '').slice(0, 7), Number(r.count || 0)]),
        );
      const pMap = toMap(patientsNow?.trends);
      const eMap = toMap(employersNow?.trends);
      const iMap = toMap(insuranceNow?.trends);
      const months = Array.from(new Set([...Object.keys(pMap), ...Object.keys(eMap), ...Object.keys(iMap)])).sort().slice(-6);
      setUserGrowthData(
        months.map((m) => ({
          name: new Date(`${m}-01`).toLocaleDateString(undefined, { month: 'short' }),
          patients: pMap[m] || 0,
          employers: eMap[m] || 0,
          insurance: iMap[m] || 0,
        })),
      );
      setActivities(activitiesRows);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error(error?.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const KpiCard = ({ title, value, icon: Icon, trend, isCurrency }) => (
    <Card className="admin-card-shadow border-none">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <div className={`flex items-center text-sm font-medium ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
            {Math.abs(trend)}%
          </div>
        </div>
        <h3 className="text-muted-foreground text-sm font-medium mb-1">{title}</h3>
        <div className="text-3xl font-bold font-display">
          {isCurrency ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) : value.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome back. Here is what is happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] bg-card">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchDashboardData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-primary-gradient">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Total Patients" value={stats.patients} icon={Users} trend={trends.patients} />
        <KpiCard title="Employers" value={stats.employers} icon={Building2} trend={trends.employers} />
        <KpiCard title="Insurance Users" value={stats.insurance} icon={ShieldCheck} trend={trends.insurance} />
        <KpiCard title="Providers" value={stats.providers} icon={Activity} trend={trends.providers} />
        <KpiCard title="Transactions" value={stats.transactions} icon={CreditCard} trend={trends.transactions} />
        <KpiCard title="Monthly Recurring (MRR)" value={stats.mrr} icon={DollarSign} trend={trends.mrr} isCurrency />
        <KpiCard title="Annual Run Rate (ARR)" value={stats.arr} icon={TrendingUp} trend={trends.arr} isCurrency />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="admin-card-shadow border-none">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `$${val}`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="admin-card-shadow border-none">
          <CardHeader>
            <CardTitle className="text-lg">User Growth</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.5)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" />
                <Bar dataKey="patients" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="employers" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="admin-card-shadow border-none flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-2 space-y-4">
            {activities.length > 0 ? activities.map((activity) => (
              <div key={activity.id} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{activity.action} {activity.resource_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.created_at || activity.created), 'MMM d, h:mm a')} by {activity.user_id || 'system'}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center text-muted-foreground py-8">No recent activities</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
