import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Users, Activity, FileText, ArrowRight, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

export default function InsuranceDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Insurance Dashboard - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {currentUser?.first_name || 'Partner'}</h1>
            <p className="text-muted-foreground mt-1">Insurance operations and population health overview.</p>
          </div>
          <Button className="rounded-xl gap-2" onClick={() => navigate('/insurance/contracts')}>
            Manage Contracts <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-emerald-500/10 to-transparent">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-emerald-700">Total Members</p>
                  <h3 className="text-3xl font-bold text-foreground">42,500</h3>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-600"><Users className="h-5 w-5" /></div>
              </div>
              <p className="text-sm font-medium text-emerald-600">+5.2% growth this year</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-blue-500/10 to-transparent">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">Avg Health Score</p>
                  <h3 className="text-3xl font-bold text-foreground">78.4</h3>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-600"><Activity className="h-5 w-5" /></div>
              </div>
              <p className="text-sm font-medium text-blue-600">+1.2 pts MoM</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-amber-500/10 to-transparent">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-amber-700">Claims Cost YTD</p>
                  <h3 className="text-3xl font-bold text-foreground">$14.2M</h3>
                </div>
                <div className="p-3 bg-amber-500/20 rounded-xl text-amber-600"><FileText className="h-5 w-5" /></div>
              </div>
              <p className="text-sm font-medium text-amber-600">-3% vs projected</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-purple-500/10 to-transparent">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-purple-700">MLR Ratio</p>
                  <h3 className="text-3xl font-bold text-foreground">82.5%</h3>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-600"><ShieldCheck className="h-5 w-5" /></div>
              </div>
              <p className="text-sm font-medium text-purple-600">Optimal range</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl shadow-sm border-border/60 h-full">
              <CardHeader>
                <CardTitle>Network Alerts & Insights</CardTitle>
                <CardDescription>Priority notifications requiring attention.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 p-4 border rounded-xl bg-destructive/5 border-destructive/20 items-start">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-destructive">High Claims Volume Detected</h4>
                    <p className="text-sm text-muted-foreground mt-1">Region Northeast 4 experiencing a 15% spike in respiratory claims over the last 48 hours.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 border rounded-xl bg-blue-500/5 border-blue-500/20 items-start">
                  <TrendingUp className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-700">Generic Substitution Opportunity</h4>
                    <p className="text-sm text-muted-foreground mt-1">New generic available for Lipitor equivalents. Potential $450k savings this quarter if members are routed.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm border-border/60 bg-muted/20">
              <CardHeader>
                <CardTitle>Quick Tools</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Button variant="outline" className="w-full justify-start rounded-xl h-12 bg-background" onClick={() => navigate('/insurance/outcomes')}>
                  <Users className="mr-3 h-4 w-4" /> Member Outcomes
                </Button>
                <Button variant="outline" className="w-full justify-start rounded-xl h-12 bg-background" onClick={() => navigate('/insurance/generics')}>
                  <Activity className="mr-3 h-4 w-4" /> Generic Drug Tracking
                </Button>
                <Button variant="outline" className="w-full justify-start rounded-xl h-12 bg-background" onClick={() => navigate('/insurance/payments')}>
                  <FileText className="mr-3 h-4 w-4" /> Payment Routing
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}