import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download, DollarSign, TrendingDown } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

export default function EmployerCostsPage() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiServerClient.fetch('/employer/costs');
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Failed to load employer costs');
        setPayload(body);
      } catch (e) {
        toast.error(e.message || 'Failed to load costs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const monthlyCosts = payload?.monthlyCosts || [];
  const savingsCategories = payload?.savingsCategories || [];
  const kpis = payload?.kpis || {
    totalHealthcareCosts: 0,
    totalSavings: 0,
    avgCostPerEmployee: 0,
    pharmacySpendPercent: 0,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Costs & Savings - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Overview</h1>
            <p className="text-muted-foreground">Track healthcare spend, visualize trends, and measure ROI.</p>
          </div>
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Download Statement</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Healthcare Costs YTD</p>
              <p className="text-3xl font-bold text-foreground">{loading ? '—' : `$${Number(kpis.totalHealthcareCosts || 0).toLocaleString()}`}</p>
              <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium">
                <TrendingDown className="h-4 w-4 mr-1" /> 4% below budget
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50 bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-primary mb-1">Total Savings YTD</p>
              <p className="text-3xl font-bold text-primary">{loading ? '—' : `$${Number(kpis.totalSavings || 0).toLocaleString()}`}</p>
              <div className="mt-4 flex items-center text-sm text-primary font-medium">
                <TrendingDown className="h-4 w-4 mr-1" /> On track for 15% ROI
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Avg Cost per Employee</p>
              <p className="text-3xl font-bold text-foreground">{loading ? '—' : `$${Number(kpis.avgCostPerEmployee || 0).toLocaleString()}`}</p>
              <p className="text-sm text-muted-foreground mt-4">Per year estimation</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Pharmacy Spend %</p>
              <p className="text-3xl font-bold text-foreground">{loading ? '—' : `${Number(kpis.pharmacySpendPercent || 0).toFixed(1)}%`}</p>
              <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium">
                <TrendingDown className="h-4 w-4 mr-1" /> Decreasing trend
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Monthly Spend Trend</CardTitle>
              <CardDescription>Trailing 6 months breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyCosts} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPharm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }}/>
                    <Area type="monotone" name="Medical" dataKey="medical" stackId="1" stroke="hsl(var(--primary))" fill="url(#colorMed)" />
                    <Area type="monotone" name="Pharmacy" dataKey="pharmacy" stackId="1" stroke="hsl(var(--secondary))" fill="url(#colorPharm)" />
                    <Area type="monotone" name="Preventive" dataKey="preventive" stackId="1" stroke="hsl(var(--accent-foreground))" fill="hsl(var(--accent-foreground))" fillOpacity={0.4} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Savings by Initiative</CardTitle>
              <CardDescription>YTD realized cost avoidance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={savingsCategories} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={32} />
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