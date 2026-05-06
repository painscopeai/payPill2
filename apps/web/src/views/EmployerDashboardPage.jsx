import React, { useMemo, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users, Activity, DollarSign, AlertCircle, Heart, Pill, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function EmployerDashboardPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ employees: 0, healthScore: 0, savings: 0, active: 0 });
  const [trendData, setTrendData] = useState([]);
  const [costData, setCostData] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const COLORS = ['hsl(199 89% 48%)', 'hsl(160 84% 39%)', 'hsl(32 95% 54%)', 'hsl(280 65% 60%)'];

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }
      try {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const [profileRes, employeesRes, metricsRes, appointmentsRes, formResponsesRes, transactionsRes, subscriptionsRes] =
          await Promise.all([
          supabase
            .from('profiles')
            .select('id,status')
            .eq('id', currentUser.id)
            .maybeSingle(),
          supabase
            .from('employer_employees')
            .select('id,status,created_at')
            .eq('employer_id', currentUser.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('employer_health_metrics')
            .select('metric_date,avg_health_score,active_users,total_employees,ytd_cost_savings')
            .eq('employer_id', currentUser.id)
            .order('metric_date', { ascending: false })
            .limit(1),
          supabase
            .from('appointments')
            .select('id,status,created_at')
            .eq('user_id', currentUser.id)
            .gte('created_at', sixMonthsAgo.toISOString())
            .order('created_at', { ascending: true }),
          supabase
            .from('form_responses')
            .select('id,completed,created_at')
            .eq('user_id', currentUser.id)
            .gte('created_at', sixMonthsAgo.toISOString())
            .order('created_at', { ascending: true }),
          supabase
            .from('transactions')
            .select('id,amount,transaction_type,status,created_at')
            .eq('user_id', currentUser.id)
            .gte('created_at', startOfYear.toISOString())
            .order('created_at', { ascending: true }),
          supabase
            .from('subscriptions')
            .select('id,status,monthly_amount,created_at')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        if (profileRes.error) throw profileRes.error;
        if (employeesRes.error) throw employeesRes.error;
        if (metricsRes.error) throw metricsRes.error;
        if (appointmentsRes.error) throw appointmentsRes.error;
        if (formResponsesRes.error) throw formResponsesRes.error;
        if (transactionsRes.error) throw transactionsRes.error;
        if (subscriptionsRes.error) throw subscriptionsRes.error;

        const profile = profileRes.data;
        const employeesRows = employeesRes.data || [];
        const latestMetrics = metricsRes.data?.[0] || null;
        const appointments = appointmentsRes.data || [];
        const forms = formResponsesRes.data || [];
        const txns = transactionsRes.data || [];
        const sub = subscriptionsRes.data?.[0] || null;

        const employees = latestMetrics?.total_employees != null
          ? Number(latestMetrics.total_employees || 0)
          : employeesRows.length;
        const activeUsers = latestMetrics?.active_users != null
          ? Number(latestMetrics.active_users || 0)
          : employeesRows.filter((e) => e.status === 'active').length;
        const ytdSavings = txns
          .filter((t) => (t.status || '').toLowerCase() === 'completed')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const healthScore = latestMetrics?.avg_health_score != null
          ? Math.round(Number(latestMetrics.avg_health_score || 0))
          : Math.round(employees > 0 ? Math.min(100, (activeUsers / employees) * 100) : 0);
        setStats({ employees, healthScore, savings: ytdSavings, active: activeUsers });

        const monthLabels = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          monthLabels.push(d.toLocaleString('default', { month: 'short' }));
        }
        const trendMap = new Map(monthLabels.map((m) => [m, { appointments: 0, completedForms: 0 }]));
        employeesRows.forEach((e) => {
          const m = new Date(e.created_at).toLocaleString('default', { month: 'short' });
          if (trendMap.has(m)) trendMap.get(m).appointments += 1;
        });
        appointments.forEach((a) => {
          const m = new Date(a.created_at).toLocaleString('default', { month: 'short' });
          if (trendMap.has(m)) trendMap.get(m).appointments += 1;
        });
        forms.forEach((f) => {
          const m = new Date(f.created_at).toLocaleString('default', { month: 'short' });
          if (trendMap.has(m) && f.completed) trendMap.get(m).completedForms += 1;
        });

        setTrendData(
          monthLabels.map((m) => {
            const row = trendMap.get(m);
            const engagement = employees > 0 ? (row.completedForms / employees) * 100 : 0;
            return {
              name: m,
              score: Math.round(Math.min(100, engagement)),
              engagement: Math.round(Math.min(100, engagement)),
            };
          }),
        );

        const spendByType = new Map();
        txns
          .filter((t) => (t.status || '').toLowerCase() === 'completed')
          .forEach((t) => {
            const key = t.transaction_type || 'Other';
            spendByType.set(key, (spendByType.get(key) || 0) + Number(t.amount || 0));
          });
        setCostData(
          [...spendByType.entries()].map(([name, value]) => ({ name, value })) || [],
        );

        const alerts = [];
        if ((profile?.status || '').toLowerCase() !== 'active') {
          alerts.push({ title: 'Employer profile inactive', time: 'Now', severity: 'high' });
        }
        if (!sub || (sub.status || '').toLowerCase() !== 'active') {
          alerts.push({ title: 'Subscription inactive', time: 'Now', severity: 'high' });
        }
        if (employees > 0 && activeUsers / employees < 0.5) {
          alerts.push({
            title: 'Low engagement warning',
            time: 'This month',
            severity: 'medium',
          });
        }
        if (txns.length > 0) {
          alerts.push({
            title: 'New financial activity recorded',
            time: 'Today',
            severity: 'info',
          });
        }
        if (alerts.length === 0) {
          alerts.push({
            title: 'No critical alerts',
            time: 'Up to date',
            severity: 'info',
          });
        }
        setRecentAlerts(alerts.slice(0, 4));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [currentUser?.id]);

  const adoptionRate = useMemo(
    () => (stats.employees > 0 ? Math.round((stats.active / stats.employees) * 100) : 0),
    [stats.active, stats.employees],
  );

  const handleDownloadReport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Employees', String(stats.employees)],
      ['Active Users', String(stats.active)],
      ['Adoption Rate %', String(adoptionRate)],
      ['Avg Health Score', String(stats.healthScore)],
      ['YTD Cost Savings', String(Number(stats.savings).toFixed(2))],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employer-dashboard-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Employer Dashboard - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {currentUser?.name || 'Admin'}
            </h1>
            <p className="text-muted-foreground">Here's what's happening with your team today.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownloadReport}>
              Download Report
            </Button>
            <Button onClick={() => navigate('/employer/bulk-onboarding')}>Invite Employees</Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="admin-grid mb-8">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                  <p className="text-3xl font-bold">{loading ? '—' : stats.employees}</p>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                Employer roster size
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-3xl font-bold">{loading ? '—' : stats.active}</p>
                </div>
                <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-secondary" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                {adoptionRate}% adoption rate
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Avg Health Score</p>
                  <p className="text-3xl font-bold text-primary">{loading ? '—' : stats.healthScore}</p>
                </div>
                <div className="h-12 w-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <Heart className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                Latest metrics snapshot
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">YTD Cost Savings</p>
                  <p className="text-3xl font-bold">
                    {loading ? '—' : `$${Number(stats.savings).toLocaleString()}`}
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-accent-foreground" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                Completed transactions (YTD)
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-2 shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Health & Engagement Trends</CardTitle>
              <CardDescription>6-month trailing overview</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="chart-container flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading trends...
                </div>
              ) : trendData.length === 0 ? (
                <div className="chart-container flex items-center justify-center text-muted-foreground">
                  No trend data available yet.
                </div>
              ) : (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Line type="monotone" name="Health Score" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" name="Engagement %" dataKey="engagement" stroke="hsl(var(--secondary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Current fiscal year</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              {loading ? (
                <div className="chart-container flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading spend...
                </div>
              ) : costData.length === 0 ? (
                <div className="chart-container flex items-center justify-center text-muted-foreground">
                  No completed transaction data yet.
                </div>
              ) : (
                <div className="chart-container flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {costData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `$${Number(value).toLocaleString()}`}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: 'none' }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Actionable Recommendations</CardTitle>
              <CardDescription>AI-driven insights to improve workforce health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 p-4 rounded-xl bg-accent/20 border border-accent/30">
                <div className="mt-1 h-8 w-8 rounded-full bg-accent/30 flex items-center justify-center shrink-0">
                  <Pill className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Generic Substitution Opportunity</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    32 employees are currently taking brand-name medications that have generic equivalents. Launching an awareness campaign could save an estimated $12,400 annually.
                  </p>
                  <Button variant="link" className="px-0 h-auto mt-2 text-accent-foreground">View Campaign Template →</Button>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="mt-1 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Low Preventive Care Utilization</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Only 41% of eligible employees have completed their annual physical. Consider adding a wellness incentive for completion.
                  </p>
                  <Button variant="link" className="px-0 h-auto mt-2">Setup Incentive →</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>System notifications requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border-b last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`h-5 w-5 ${
                        alert.severity === 'high' ? 'text-destructive' : 
                        alert.severity === 'medium' ? 'text-orange-500' : 'text-primary'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.time}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/employer/analytics')}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}