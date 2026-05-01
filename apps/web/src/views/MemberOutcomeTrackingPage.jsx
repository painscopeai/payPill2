import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, Download, Filter, Eye } from 'lucide-react';

const mockMembers = [
  { id: 'MEM-4829', name: 'James Wilson', score: 65, trend: 'down', risk: 'High', lastVisit: '2026-03-12' },
  { id: 'MEM-9210', name: 'Sarah Connor', score: 88, trend: 'up', risk: 'Low', lastVisit: '2026-04-01' },
  { id: 'MEM-1102', name: 'Robert Chen', score: 72, trend: 'flat', risk: 'Medium', lastVisit: '2026-02-28' },
];

const outcomeData = [
  { month: 'Jan', avgScore: 75.2, compliance: 82 },
  { month: 'Feb', avgScore: 76.0, compliance: 84 },
  { month: 'Mar', avgScore: 76.8, compliance: 85 },
  { month: 'Apr', avgScore: 78.4, compliance: 89 },
];

export default function MemberOutcomeTrackingPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Member Outcomes - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Member Outcomes</h1>
            <p className="text-muted-foreground mt-1">Track health progression and risk stratification.</p>
          </div>
          <Button variant="outline" className="rounded-xl gap-2"><Download className="h-4 w-4"/> Export CSV</Button>
        </div>

        <Card className="rounded-2xl border-border/60 shadow-sm mb-8">
          <CardHeader>
            <CardTitle>Population Health Trajectory</CardTitle>
            <CardDescription>Average health score vs Care plan compliance (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={outcomeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid hsl(var(--border))'}} />
                  <Line type="monotone" dataKey="avgScore" name="Avg Health Score" stroke="hsl(var(--primary))" strokeWidth={3} dot={{r: 4}} />
                  <Line type="monotone" dataKey="compliance" name="Compliance %" stroke="hsl(var(--secondary))" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/20 border-b pb-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by Member ID or Name..." 
                  className="pl-9 rounded-xl bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="rounded-xl gap-2"><Filter className="h-4 w-4"/> Filters</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6">Member</TableHead>
                  <TableHead>Health Score</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead className="text-right px-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockMembers.map((mem) => (
                  <TableRow key={mem.id}>
                    <TableCell className="px-6 py-4">
                      <div className="font-medium">{mem.name}</div>
                      <div className="text-xs text-muted-foreground">{mem.id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{mem.score}</span>
                        {mem.trend === 'down' && <span className="text-destructive text-xs">↓</span>}
                        {mem.trend === 'up' && <span className="text-success text-xs">↑</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {mem.risk === 'High' && <Badge variant="secondary" className="bg-destructive/10 text-destructive border-none">High Risk</Badge>}
                      {mem.risk === 'Medium' && <Badge variant="secondary" className="bg-warning/10 text-warning border-none">Medium</Badge>}
                      {mem.risk === 'Low' && <Badge variant="secondary" className="bg-success/10 text-success border-none">Low Risk</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{mem.lastVisit}</TableCell>
                    <TableCell className="text-right px-6">
                      <Button variant="ghost" size="sm" className="rounded-xl text-primary"><Eye className="h-4 w-4 mr-2"/> View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}