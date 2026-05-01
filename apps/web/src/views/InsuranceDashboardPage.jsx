import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users, FileText, Heart, AlertCircle, Plus, ChevronRight, Activity, Clock } from 'lucide-react';
import pb from '@/lib/supabaseMappedCollections';

export default function InsuranceDashboardPage() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ members: 0, claims: 0, healthScore: 0, exposure: 0 });

  // Mock data for charts
  const volumeData = [
    { month: 'Jan', medical: 4000, pharmacy: 2400 },
    { month: 'Feb', medical: 3000, pharmacy: 1398 },
    { month: 'Mar', medical: 2000, pharmacy: 9800 },
    { month: 'Apr', medical: 2780, pharmacy: 3908 },
    { month: 'May', medical: 1890, pharmacy: 4800 },
    { month: 'Jun', medical: 2390, pharmacy: 3800 },
  ];

  const exposureData = [
    { name: 'Medical', value: 45 }, { name: 'Pharmacy', value: 25 },
    { name: 'Preventive', value: 15 }, { name: 'Dental', value: 10 },
    { name: 'Vision', value: 5 }
  ];
  
  const contractPerformance = [
    { name: 'Acme Corp', mlr: 82, satisfaction: 90 },
    { name: 'TechFlow', mlr: 78, satisfaction: 85 },
    { name: 'GlobalNet', mlr: 89, satisfaction: 75 },
    { name: 'CityGov', mlr: 75, satisfaction: 92 },
  ];

  const COLORS = ['hsl(199 89% 48%)', 'hsl(160 84% 39%)', 'hsl(32 95% 54%)', 'hsl(280 65% 60%)', 'hsl(340 75% 55%)'];

  useEffect(() => {
    // Mock fetch for presentation
    setStats({ members: 12450, claims: 842, healthScore: 76, exposure: 12400000 });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Insurance Dashboard - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Insurance Operations
            </h1>
            <p className="text-muted-foreground">Welcome back, {currentUser?.name || 'Administrator'}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Generate Report</Button>
            <Button>New Contract</Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Covered Members</p>
                  <p className="text-3xl font-bold">{stats.members.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Active Claims</p>
                  <p className="text-3xl font-bold">{stats.claims}</p>
                </div>
                <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Population Health Score</p>
                  <p className="text-3xl font-bold text-primary">{stats.healthScore}</p>
                </div>
                <div className="h-12 w-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <Heart className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Cost Exposure YTD</p>
                  <p className="text-3xl font-bold">${(stats.exposure / 1000000).toFixed(1)}M</p>
                </div>
                <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-2 shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Claims Volume Trend</CardTitle>
              <CardDescription>Trailing 6 months processing volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volumeData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="medical" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="pharmacy" stroke="hsl(var(--secondary))" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Exposure Breakdown</CardTitle>
              <CardDescription>By service category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px] flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={exposureData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                      {exposureData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Contract Performance</CardTitle>
              <CardDescription>MLR vs Satisfaction for top accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contractPerformance} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{ borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="mlr" name="Medical Loss Ratio (%)" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                    <Bar dataKey="satisfaction" name="Satisfaction (%)" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 flex flex-col">
            <CardHeader>
              <CardTitle>System Alerts & Activity</CardTitle>
              <CardDescription>Real-time operational monitoring</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                {[
                  { type: 'alert', text: 'High claims volume anomaly detected in Region 4', time: '10 min ago', severity: 'high' },
                  { type: 'activity', text: 'Contract #8892 renewed by Acme Corp', time: '2 hrs ago' },
                  { type: 'alert', text: 'Provider #441 pending credential review', time: '4 hrs ago', severity: 'medium' },
                  { type: 'activity', text: 'Monthly reconciliation report generated', time: 'Yesterday' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-3 rounded-lg border bg-card items-start">
                    <div className="mt-0.5">
                      {item.type === 'alert' ? (
                        <AlertCircle className={`h-5 w-5 ${item.severity === 'high' ? 'text-destructive' : 'text-orange-500'}`} />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-primary">View All Activity <ChevronRight className="ml-1 h-4 w-4" /></Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}