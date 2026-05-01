import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users, Activity, DollarSign, TrendingUp, AlertCircle, Heart, Pill, Calendar } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';

export default function EmployerDashboardPage() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ employees: 0, healthScore: 0, savings: 0, active: 0 });
  const [loading, setLoading] = useState(true);

  // Mock data for charts if DB is empty
  const trendData = [
    { name: 'Jan', score: 72, engagement: 65 }, { name: 'Feb', score: 74, engagement: 68 },
    { name: 'Mar', score: 73, engagement: 70 }, { name: 'Apr', score: 76, engagement: 74 },
    { name: 'May', score: 78, engagement: 79 }, { name: 'Jun', score: 81, engagement: 82 },
  ];

  const costData = [
    { name: 'Medical', value: 45000 }, { name: 'Pharmacy', value: 25000 },
    { name: 'Preventive', value: 15000 }, { name: 'Wellness', value: 5000 }
  ];
  const COLORS = ['hsl(199 89% 48%)', 'hsl(160 84% 39%)', 'hsl(32 95% 54%)', 'hsl(280 65% 60%)'];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Just mock some stats for dashboard visual if not querying full aggregation yet
        setStats({ employees: 142, healthScore: 78, savings: 42500, active: 118 });
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
            <Button variant="outline">Download Report</Button>
            <Button>Invite Employees</Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="admin-grid mb-8">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                  <p className="text-3xl font-bold">{stats.employees}</p>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium">
                <TrendingUp className="h-4 w-4 mr-1" /> +12 this month
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-3xl font-bold">{stats.active}</p>
                </div>
                <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-secondary" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                83% adoption rate
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Avg Health Score</p>
                  <p className="text-3xl font-bold text-primary">{stats.healthScore}</p>
                </div>
                <div className="h-12 w-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <Heart className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium">
                <TrendingUp className="h-4 w-4 mr-1" /> +3 pts vs last qtr
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">YTD Cost Savings</p>
                  <p className="text-3xl font-bold">${(stats.savings).toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-accent-foreground" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium">
                <TrendingUp className="h-4 w-4 mr-1" /> 14% reduction
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
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Current fiscal year</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
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
                      formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: 'none' }} 
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
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
                {[
                  { title: 'High-cost claim detected', time: '2 hours ago', severity: 'high' },
                  { title: '15 new employees onboarded', time: 'Yesterday', severity: 'info' },
                  { title: 'Quarterly analytics report ready', time: '2 days ago', severity: 'info' },
                  { title: 'Low engagement warning in Sales dept', time: '3 days ago', severity: 'medium' }
                ].map((alert, i) => (
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
                    <Button variant="ghost" size="sm">View</Button>
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