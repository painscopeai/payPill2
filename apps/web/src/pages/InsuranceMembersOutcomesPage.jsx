import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, Search, Filter, TrendingUp, Activity, ShieldCheck, Heart } from 'lucide-react';

export default function InsuranceMembersOutcomesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for outcomes
  const chronicConditions = [
    { name: 'Hypertension', count: 4200 },
    { name: 'Type 2 Diabetes', count: 2800 },
    { name: 'Asthma', count: 1950 },
    { name: 'Depression', count: 1800 },
    { name: 'Osteoarthritis', count: 1200 },
  ];

  const adherenceData = [
    { name: 'Adherent (>80%)', value: 65, color: 'hsl(160 84% 39%)' },
    { name: 'Partial (50-80%)', value: 25, color: 'hsl(32 95% 54%)' },
    { name: 'Non-Adherent (<50%)', value: 10, color: 'hsl(0 84% 60%)' },
  ];

  const healthScores = [
    { range: '0-20', count: 150 },
    { range: '21-40', count: 850 },
    { range: '41-60', count: 2100 },
    { range: '61-80', count: 5400 },
    { range: '81-100', count: 3950 },
  ];

  const members = [
    { id: 'MEM-8821', name: 'James Wilson', score: 82, chronic: 1, adherence: 'High', risk: 'Low', lastActive: '2 days ago' },
    { id: 'MEM-3392', name: 'Maria Garcia', score: 65, chronic: 2, adherence: 'Medium', risk: 'Medium', lastActive: '1 week ago' },
    { id: 'MEM-1104', name: 'Robert Chen', score: 45, chronic: 3, adherence: 'Low', risk: 'High', lastActive: 'Yesterday' },
    { id: 'MEM-9923', name: 'Sarah Jenkins', score: 91, chronic: 0, adherence: 'N/A', risk: 'Low', lastActive: '1 month ago' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Member Outcomes - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Population Outcomes</h1>
            <p className="text-muted-foreground">Track health metrics and preventive care across your members.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Contract" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contracts</SelectItem>
                <SelectItem value="c1">Acme Corp</SelectItem>
                <SelectItem value="c2">TechFlow</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export Report</Button>
          </div>
        </div>

        {/* Top KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm border-border/50 border-l-4 border-l-primary">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Avg Health Score</p>
              <p className="text-3xl font-bold mt-2">74.2</p>
              <div className="mt-2 flex items-center text-sm text-emerald-600 font-medium">
                <TrendingUp className="h-4 w-4 mr-1" /> +1.5 pts YTD
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50 border-l-4 border-l-secondary">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Chronic Conditions</p>
              <p className="text-3xl font-bold mt-2">38%</p>
              <p className="text-sm text-muted-foreground mt-2">Of total population</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50 border-l-4 border-l-emerald-500">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Medication Adherence</p>
              <p className="text-3xl font-bold mt-2">65%</p>
              <p className="text-sm text-muted-foreground mt-2">Taking as prescribed</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50 border-l-4 border-l-accent-foreground">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Preventive Completion</p>
              <p className="text-3xl font-bold mt-2">42%</p>
              <div className="mt-2 flex items-center text-sm text-emerald-600 font-medium">
                <TrendingUp className="h-4 w-4 mr-1" /> +5% YoY
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Top Chronic Conditions</CardTitle>
              <CardDescription>By affected member count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chronicConditions} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Medication Adherence</CardTitle>
              <CardDescription>Overall population adherence rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[300px] flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={adherenceData} 
                      cx="50%" cy="80%" 
                      startAngle={180} endAngle={0} 
                      innerRadius={80} outerRadius={120} 
                      paddingAngle={2} 
                      dataKey="value" stroke="none"
                    >
                      {adherenceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: '12px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-border/50">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search member ID or name..." className="pl-9 bg-background" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto"><Filter className="h-4 w-4"/> Advanced Filter</Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Member</th>
                  <th className="px-6 py-4 font-medium">Health Score</th>
                  <th className="px-6 py-4 font-medium">Chronic Cond.</th>
                  <th className="px-6 py-4 font-medium">Adherence</th>
                  <th className="px-6 py-4 font-medium">Risk Level</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.id.toLowerCase().includes(searchTerm.toLowerCase())).map((m) => (
                  <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{m.name}</div>
                      <div className="text-muted-foreground text-xs">{m.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${m.score >= 80 ? 'text-emerald-600' : m.score >= 60 ? 'text-orange-500' : 'text-destructive'}`}>
                        {m.score}/100
                      </span>
                    </td>
                    <td className="px-6 py-4 text-foreground">{m.chronic}</td>
                    <td className="px-6 py-4 text-muted-foreground">{m.adherence}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={m.risk === 'High' ? 'text-destructive border-destructive/30 bg-destructive/10' : m.risk === 'Medium' ? 'text-orange-500 border-orange-500/30 bg-orange-500/10' : 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10'}>
                        {m.risk}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm">View Profile</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}