import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Download, TrendingDown, Pill, Stethoscope, ShieldPlus } from 'lucide-react';

const savingsData = [
  { month: 'Jan', generic: 12000, preventive: 8000 },
  { month: 'Feb', generic: 15000, preventive: 12000 },
  { month: 'Mar', generic: 18500, preventive: 11000 },
  { month: 'Apr', generic: 22000, preventive: 16000 },
  { month: 'May', generic: 24500, preventive: 20000 },
];

const deptSavings = [
  { dept: 'Engineering', amount: 35000 },
  { dept: 'Sales', amount: 28000 },
  { dept: 'Marketing', amount: 15000 },
  { dept: 'Operations', amount: 22000 },
];

export default function CostSavingsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Cost Savings & ROI - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cost Savings & ROI</h1>
            <p className="text-muted-foreground mt-1">Track financial impact of health initiatives.</p>
          </div>
          <Button variant="outline" className="rounded-xl gap-2"><Download className="h-4 w-4"/> Download Report</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Savings YTD</p>
                  <h3 className="text-3xl font-bold text-foreground">$142,500</h3>
                </div>
              </div>
              <p className="text-sm text-primary font-medium">18% reduction vs projected spend</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Pill className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pharmacy Optimization</p>
                  <h3 className="text-2xl font-bold text-foreground">$92,000</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Generic substitution & formulary</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <ShieldPlus className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Preventive Care</p>
                  <h3 className="text-2xl font-bold text-foreground">$50,500</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Avoided ER visits & readmissions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-2xl shadow-sm border-border/60">
            <CardHeader>
              <CardTitle>Cumulative Savings Trend</CardTitle>
              <CardDescription>Monthly progression of cost avoidance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={savingsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid hsl(var(--border))'}} formatter={(val) => `$${val.toLocaleString()}`} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" dataKey="generic" name="Pharmacy" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorGen)" />
                    <Area type="monotone" dataKey="preventive" name="Preventive" stroke="hsl(var(--secondary))" fillOpacity={1} fill="url(#colorPrev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border-border/60">
            <CardHeader>
              <CardTitle>Savings by Department</CardTitle>
              <CardDescription>YTD breakdown across business units</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptSavings} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} tickFormatter={(val) => `$${val/1000}k`} />
                    <YAxis dataKey="dept" type="category" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--foreground))', fontSize: 12}} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{borderRadius: '8px', border: '1px solid hsl(var(--border))'}} formatter={(val) => `$${val.toLocaleString()}`} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={30} />
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