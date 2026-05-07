import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, Search, Filter, TrendingUp, Activity, ShieldCheck, Heart, ChevronRight, ChevronDown } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { exportToCSV } from '@/lib/csvExport';

export default function InsuranceMembersOutcomesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployer, setSelectedEmployer] = useState('all');
  const [collapsedEmployers, setCollapsedEmployers] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiServerClient.fetch('/insurance/members');
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Failed to load members outcomes');
        setPayload(body);
      } catch (e) {
        toast.error(e.message || 'Failed to load outcomes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const chronicConditions = payload?.chronicConditions || [];
  const adherenceData = useMemo(
    () => (payload?.adherenceData || []).map((row, idx) => ({
      ...row,
      color: ['hsl(160 84% 39%)', 'hsl(32 95% 54%)', 'hsl(0 84% 60%)'][idx % 3],
    })),
    [payload],
  );
  const healthScores = payload?.healthScores || [];
  const members = useMemo(() => payload?.members || [], [payload]);
  const employers = payload?.employers || [];
  const kpis = payload?.kpis || {
    averageHealthScore: 0,
    chronicConditionRate: 0,
    adherenceRate: 0,
    preventiveCompletion: 0,
  };
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        String(m.name || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        String(m.id || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesEmployer = selectedEmployer === 'all' || m.employer === selectedEmployer;
      return matchesSearch && matchesEmployer;
    });
  }, [members, searchTerm, selectedEmployer]);
  const groupedMembers = useMemo(() => {
    const grouped = new Map();
    for (const member of filteredMembers) {
      const key = member.employer || 'Unassigned Employer';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(member);
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredMembers]);

  useEffect(() => {
    setCollapsedEmployers((prev) => {
      const next = {};
      for (const [employer] of groupedMembers) {
        next[employer] = prev[employer] ?? true;
      }
      return next;
    });
  }, [groupedMembers]);

  const toggleEmployerCollapse = (employer) => {
    setCollapsedEmployers((prev) => ({
      ...prev,
      [employer]: !(prev[employer] ?? true),
    }));
  };
  const handleExportReport = () => {
    const rows = filteredMembers.map((m) => ({
      member_name: m.name || '',
      member_id: m.id || '',
      employer: m.employer || '',
      health_score: Number(m.score || 0),
      chronic_conditions: Number(m.chronic || 0),
      adherence: m.adherence || '',
      risk: m.risk || '',
      status: m.status || '',
      last_active: m.lastActive ? new Date(m.lastActive).toLocaleString() : '',
    }));
    exportToCSV(rows, `insurance-members-outcomes-${selectedEmployer}`);
    toast.success('Members report exported');
  };

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
            <Select value={selectedEmployer} onValueChange={setSelectedEmployer}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Employer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employers</SelectItem>
                {employers.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={handleExportReport}><Download className="h-4 w-4" /> Export Report</Button>
          </div>
        </div>

        {/* Top KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm border-border/50 border-l-4 border-l-primary">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Avg Health Score</p>
              <p className="text-3xl font-bold mt-2">{loading ? '—' : kpis.averageHealthScore}</p>
              <div className="mt-2 flex items-center text-sm text-emerald-600 font-medium">
                <TrendingUp className="h-4 w-4 mr-1" /> +1.5 pts YTD
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50 border-l-4 border-l-secondary">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Chronic Conditions</p>
              <p className="text-3xl font-bold mt-2">{loading ? '—' : `${kpis.chronicConditionRate}%`}</p>
              <p className="text-sm text-muted-foreground mt-2">Of total population</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50 border-l-4 border-l-emerald-500">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Medication Adherence</p>
              <p className="text-3xl font-bold mt-2">{loading ? '—' : `${kpis.adherenceRate}%`}</p>
              <p className="text-sm text-muted-foreground mt-2">Taking as prescribed</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50 border-l-4 border-l-accent-foreground">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Preventive Completion</p>
              <p className="text-3xl font-bold mt-2">{loading ? '—' : `${kpis.preventiveCompletion}%`}</p>
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
                {groupedMembers.map(([employer, rows]) => (
                  <React.Fragment key={employer}>
                    <tr
                      className="bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleEmployerCollapse(employer)}
                    >
                      <td colSpan={6} className="px-6 py-3 text-sm font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          {collapsedEmployers[employer] ? (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{employer}</span>
                          <span className="text-xs text-muted-foreground font-normal">({rows.length})</span>
                        </div>
                      </td>
                    </tr>
                    {!collapsedEmployers[employer] && rows.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{m.name || m.email || '—'}</div>
                          <div className="text-muted-foreground text-xs">{m.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${Number(m.score) >= 80 ? 'text-emerald-600' : Number(m.score) >= 60 ? 'text-orange-500' : 'text-destructive'}`}>
                            {Number.isFinite(Number(m.score)) ? `${m.score}/100` : '—'}
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
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}