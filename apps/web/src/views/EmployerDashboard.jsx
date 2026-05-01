import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header.jsx';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, DollarSign, TrendingUp, UserPlus, HeartPulse, FileText, ArrowRight, Settings, BarChart } from 'lucide-react';
import pb from '@/lib/supabaseMappedCollections';

export default function EmployerDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ employees: 0, active: 0, avgScore: 0, savings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser?.id) return;
      try {
        const empRecords = await pb.collection('employer_employees').getFullList({
          filter: `employer_id="${currentUser.id}"`,
          $autoCancel: false
        });
        
        setStats({
          employees: empRecords.length || 142, // fallback for demo
          active: empRecords.filter(r => r.status === 'active').length || 135,
          avgScore: 84, // mock aggregate
          savings: 42500 // mock aggregate
        });
      } catch (err) {
        console.error("Error fetching employer stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [currentUser]);

  const recentActivity = [
    { id: 1, type: 'enrollment', text: 'Maya Chen completed health onboarding.', time: '2 hours ago', icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 2, type: 'alert', text: 'Q2 Wellness Program reached 80% participation.', time: '5 hours ago', icon: HeartPulse, color: 'text-green-500', bg: 'bg-green-500/10' },
    { id: 3, type: 'system', text: 'Monthly cost savings report generated.', time: '1 day ago', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Employer Dashboard - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {currentUser?.first_name || 'Admin'}</h1>
            <p className="text-muted-foreground mt-1">Acme Corp Employer Portal overview.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl" onClick={() => navigate('/employer/onboarding')}>Bulk Onboarding</Button>
            <Button className="rounded-xl gap-2" onClick={() => navigate('/employer/employees')}>
              Manage Employees <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-card to-muted/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Employees</p>
                  <h3 className="text-3xl font-bold">{loading ? '-' : stats.employees}</h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-success mr-1" />
                <span className="text-success font-medium">+12%</span>
                <span className="text-muted-foreground ml-2">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-card to-muted/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Active Users</p>
                  <h3 className="text-3xl font-bold">{loading ? '-' : stats.active}</h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-muted-foreground">{Math.round((stats.active/stats.employees)*100) || 0}% adoption rate</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-card to-muted/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Avg Health Score</p>
                  <h3 className="text-3xl font-bold">{loading ? '-' : stats.avgScore}</h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <HeartPulse className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-success mr-1" />
                <span className="text-success font-medium">+2 pts</span>
                <span className="text-muted-foreground ml-2">from last quarter</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-card to-muted/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Cost Savings YTD</p>
                  <h3 className="text-3xl font-bold">${loading ? '-' : stats.savings.toLocaleString()}</h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-none font-medium">On track for 2026</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl shadow-sm border-border/50">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest events across your organization.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {recentActivity.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div key={activity.id} className="flex gap-4 items-start">
                        <div className={`mt-0.5 h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${activity.bg} ${activity.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{activity.text}</p>
                          <p className="text-sm text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm border-border/50 bg-secondary text-secondary-foreground">
              <CardHeader>
                <CardTitle className="text-secondary-foreground">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Button variant="secondary" className="w-full justify-start bg-secondary-foreground/10 hover:bg-secondary-foreground/20 text-secondary-foreground rounded-xl" onClick={() => navigate('/employer/analytics')}>
                  <BarChart className="mr-2 h-4 w-4" /> View Analytics
                </Button>
                <Button variant="secondary" className="w-full justify-start bg-secondary-foreground/10 hover:bg-secondary-foreground/20 text-secondary-foreground rounded-xl" onClick={() => navigate('/employer/costs')}>
                  <DollarSign className="mr-2 h-4 w-4" /> Cost & ROI Reports
                </Button>
                <Button variant="secondary" className="w-full justify-start bg-secondary-foreground/10 hover:bg-secondary-foreground/20 text-secondary-foreground rounded-xl" onClick={() => navigate('/employer/settings')}>
                  <Settings className="mr-2 h-4 w-4" /> Platform Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}