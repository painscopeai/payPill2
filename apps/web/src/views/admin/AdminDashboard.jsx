
import React, { useState, useEffect } from 'react';
import { adminCountExact, adminListRecent } from '@/lib/adminSupabaseList.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Building2, ShieldCheck, Activity,
  CreditCard, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight,
  RefreshCw, Download, CheckCircle2, Clock
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))'];

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    patients: 0, employers: 0, insurance: 0, providers: 0,
    transactions: 0, subscriptions: 0, mrr: 0, arr: 0
  });
  const [activities, setActivities] = useState([]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [
        patientsC, employersC, insuranceC, providersC,
        transactionsC, subscriptionsC,
        activitiesRows
      ] = await Promise.all([
        adminCountExact('patients'),
        adminCountExact('employers'),
        adminCountExact('insurance_companies'),
        adminCountExact('providers'),
        adminCountExact('transactions'),
        adminCountExact('subscriptions', { column: 'status', value: 'active' }),
        adminListRecent('audit_logs', 10),
      ]);

      setStats({
        patients: patientsC,
        employers: employersC,
        insurance: insuranceC,
        providers: providersC,
        transactions: transactionsC,
        subscriptions: subscriptionsC,
        mrr: subscriptionsC * 49.99,
        arr: subscriptionsC * 49.99 * 12
      });

      setActivities(activitiesRows);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const revenueData = [
    { name: 'Jan', revenue: 4000 }, { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 5000 }, { name: 'Apr', revenue: 4500 },
    { name: 'May', revenue: 6000 }, { name: 'Jun', revenue: 5500 },
  ];

  const userGrowthData = [
    { name: 'Week 1', patients: 120, employers: 10, insurance: 2 },
    { name: 'Week 2', patients: 150, employers: 12, insurance: 2 },
    { name: 'Week 3', patients: 200, employers: 15, insurance: 3 },
    { name: 'Week 4', patients: 280, employers: 18, insurance: 4 },
  ];

  const subscriptionData = [
    { name: 'Active', value: stats.subscriptions || 0 },
    { name: 'Paused', value: 50 },
    { name: 'Expired', value: 100 },
  ];

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
        <KpiCard title="Total Patients" value={stats.patients} icon={Users} trend={12.5} />
        <KpiCard title="Employers" value={stats.employers} icon={Building2} trend={5.2} />
        <KpiCard title="Insurance Users" value={stats.insurance} icon={ShieldCheck} trend={-2.4} />
        <KpiCard title="Providers" value={stats.providers} icon={Activity} trend={8.1} />
        <KpiCard title="Transactions" value={stats.transactions} icon={CreditCard} trend={15.3} />
        <KpiCard title="Active Subscriptions" value={stats.subscriptions} icon={CheckCircle2} trend={4.7} />
        <KpiCard title="Monthly Recurring (MRR)" value={stats.mrr} icon={DollarSign} trend={10.2} isCurrency />
        <KpiCard title="Annual Run Rate (ARR)" value={stats.arr} icon={TrendingUp} trend={10.2} isCurrency />
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

        <Card className="admin-card-shadow border-none">
          <CardHeader>
            <CardTitle className="text-lg">Subscription Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subscriptionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {subscriptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
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
