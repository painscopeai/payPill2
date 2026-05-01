import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Download, Pill, TrendingUp, BellRing } from 'lucide-react';

export default function InsuranceGenericsPage() {

  const savingsData = [
    { month: 'Jan', savings: 120000 }, { month: 'Feb', savings: 145000 },
    { month: 'Mar', savings: 160000 }, { month: 'Apr', savings: 190000 },
    { month: 'May', savings: 210000 }, { month: 'Jun', savings: 250000 },
  ];

  const costComparison = [
    { name: 'Lipitor (Atorvastatin)', brand: 120, generic: 15 },
    { name: 'Nexium (Rosuvastatin)', brand: 250, generic: 20 },
    { name: 'Lexapro (Esomeprazole)', brand: 200, generic: 18 },
    { name: 'Adderall (Amphetamine)', brand: 180, generic: 25 },
    { name: 'Zoloft (Escitalopram)', brand: 150, generic: 12 },
  ];

  const categoryData = [
    { name: 'Cardiovascular', value: 35 },
    { name: 'Mental Health', value: 25 },
    { name: 'Gastrointestinal', value: 20 },
    { name: 'Pain Mgmt', value: 15 },
    { name: 'Other', value: 5 },
  ];
  const COLORS = ['hsl(199 89% 48%)', 'hsl(160 84% 39%)', 'hsl(32 95% 54%)', 'hsl(280 65% 60%)', 'hsl(340 75% 55%)'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Generic Substitutions - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Generic Substitution Program</h1>
            <p className="text-muted-foreground">Track adherence, savings, and substitution opportunities.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export Data</Button>
            <Button className="gap-2"><BellRing className="h-4 w-4" /> Send Recommendations</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Total Generic Savings YTD</p>
              <p className="text-3xl font-bold mt-2 text-emerald-600">$1.08M</p>
              <div className="mt-2 flex items-center text-sm text-emerald-600 font-medium">
                <TrendingUp className="h-4 w-4 mr-1" /> 18% over target
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Generic Adoption Rate</p>
              <p className="text-3xl font-bold mt-2">84.2%</p>
              <p className="text-sm text-muted-foreground mt-2">Of total eligible Rx</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Eligible Medications</p>
              <p className="text-3xl font-bold mt-2">1,245</p>
              <p className="text-sm text-muted-foreground mt-2">With generic alternatives</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50 bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-primary">Missed Savings Opportunity</p>
              <p className="text-3xl font-bold mt-2 text-primary">$425K</p>
              <p className="text-sm text-primary/80 mt-2">Annual projection</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Brand vs Generic Cost Variance</CardTitle>
              <CardDescription>Top 5 prescribed medications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costComparison} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{ borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="brand" name="Brand Cost ($)" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="generic" name="Generic Cost ($)" fill="hsl(var(--emerald-500))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Cumulative Savings Trend</CardTitle>
              <CardDescription>Realized savings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={savingsData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip contentStyle={{ borderRadius: '8px' }} formatter={(val) => `$${val.toLocaleString()}`} />
                    <Line type="monotone" dataKey="savings" name="Cumulative Savings" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}