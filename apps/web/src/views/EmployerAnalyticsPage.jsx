import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';

export default function EmployerAnalyticsPage() {
  
  // Mock data for analytics
  const scoreDistribution = [
    { range: '0-20', count: 2 },
    { range: '21-40', count: 8 },
    { range: '41-60', count: 15 },
    { range: '61-80', count: 45 },
    { range: '81-100', count: 30 },
  ];

  const riskData = [
    { name: 'Low Risk', value: 65, color: 'hsl(160 84% 39%)' },
    { name: 'Medium Risk', value: 25, color: 'hsl(32 95% 54%)' },
    { name: 'High Risk', value: 10, color: 'hsl(0 84% 60%)' },
  ];

  const deptEngagement = [
    { name: 'Engineering', assessments: 85, visits: 60, wellness: 45 },
    { name: 'Sales', assessments: 65, visits: 40, wellness: 30 },
    { name: 'Marketing', assessments: 90, visits: 70, wellness: 60 },
    { name: 'HR', assessments: 95, visits: 80, wellness: 85 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Health Analytics - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Population Health Analytics</h1>
            <p className="text-muted-foreground">Deep dive into workforce health metrics and engagement.</p>
          </div>
          <div className="flex items-center gap-3">
            <Select defaultValue="90d">
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          </div>
        </div>

        {/* Highlight Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-semibold text-primary flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" /> Positive Trend
              </h3>
              <p className="text-sm text-foreground">
                Preventive care utilization increased by 14% this quarter, largely driven by the Marketing department.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/5 border-orange-500/20">
            <CardContent className="p-6">
              <h3 className="font-semibold text-orange-600 flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" /> Focus Area
              </h3>
              <p className="text-sm text-foreground">
                High blood pressure diagnoses represent 24% of the high-risk cohort. Consider a specialized wellness program.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-6">
              <h3 className="font-semibold text-emerald-600 flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" /> Cost Impact
              </h3>
              <p className="text-sm text-foreground">
                Generic drug substitution rates reached 88%, resulting in an estimated $12k savings over the last 90 days.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Health Score Distribution</CardTitle>
              <CardDescription>Number of employees per score range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistribution} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Risk Stratification</CardTitle>
              <CardDescription>Current workforce risk breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskData}
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 lg:col-span-2">
            <CardHeader>
              <CardTitle>Department Engagement Comparison</CardTitle>
              <CardDescription>Participation in various health initiatives (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptEngagement} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{ borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar name="Health Assessments" dataKey="assessments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar name="Preventive Visits" dataKey="visits" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    <Bar name="Wellness Programs" dataKey="wellness" fill="hsl(var(--accent-foreground))" radius={[4, 4, 0, 0]} />
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