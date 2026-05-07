import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Download } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

export default function InsuranceContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [claims, setClaims] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [kpis, setKpis] = useState({
    totalReceivable: 0,
    totalClaims: 0,
    avgClaimValue: 0,
    patientsReceivedCare: 0,
  });
  const [quality, setQuality] = useState({
    patientsReceivedCare: 0,
    coveredEmployers: 0,
    claimsCount: 0,
    avgClaimValue: 0,
    topService: 'N/A',
    topServiceCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (fromDate) qs.set('from', fromDate);
        if (toDate) qs.set('to', toDate);
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        const contractsRes = await apiServerClient.fetch(`/insurance/contracts${suffix}`);
        const contractsBody = await contractsRes.json().catch(() => ({}));
        if (!contractsRes.ok) throw new Error(contractsBody.error || 'Failed to load claims');
        setContracts(contractsBody.items || []);
        setClaims(contractsBody.claims || []);
        setMonthlyRevenue(contractsBody.monthlyRevenue || []);
        setTopServices(contractsBody.topServices || []);
        setKpis(contractsBody.kpis || {});
        setQuality(contractsBody.qualityAnalytics || {});
      } catch (e) {
        toast.error(e.message || 'Failed to load claims');
      } finally {
        setLoading(false);
      }
    };
    void load();
    const t = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(t);
  }, [fromDate, toDate]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Active</Badge>;
      case 'expired': return <Badge variant="secondary" className="text-muted-foreground">Expired</Badge>;
      case 'pending': return <Badge variant="outline" className="text-orange-500 border-orange-500/30">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Claims - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Claims Management</h1>
            <p className="text-muted-foreground">Track receivables from employer care activity in real time.</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[170px]" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[170px]" />
            <Button variant="outline" className="gap-2 hidden sm:flex"><Download className="h-4 w-4" /> Export</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm border-border/50"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Receivable</p><p className="text-3xl font-bold">${Number(kpis.totalReceivable || 0).toLocaleString()}</p></CardContent></Card>
          <Card className="shadow-sm border-border/50"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Claims</p><p className="text-3xl font-bold">{Number(kpis.totalClaims || 0).toLocaleString()}</p></CardContent></Card>
          <Card className="shadow-sm border-border/50"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Avg Claim Value</p><p className="text-3xl font-bold">${Number(kpis.avgClaimValue || 0).toLocaleString()}</p></CardContent></Card>
          <Card className="shadow-sm border-border/50"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Patients Received Care</p><p className="text-3xl font-bold">{Number(kpis.patientsReceivedCare || 0).toLocaleString()}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardHeader><CardTitle>Monthly Claims Revenue</CardTitle><CardDescription>Real-time receivable trend</CardDescription></CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardHeader><CardTitle>High Occurring Services</CardTitle><CardDescription>Most frequent claim-generating services</CardDescription></CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topServices.map((s) => ({ name: s.name, value: s.count }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip formatter={(v) => `${v} occurrences`} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm border-border/50"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Covered Employers</p><p className="text-3xl font-bold">{quality.coveredEmployers || 0}</p></CardContent></Card>
          <Card className="shadow-sm border-border/50"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Top Service</p><p className="text-xl font-semibold">{quality.topService || 'N/A'}</p><p className="text-sm text-muted-foreground mt-2">{quality.topServiceCount || 0} occurrences</p></CardContent></Card>
          <Card className="shadow-sm border-border/50"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Claim Quality Signal</p><p className="text-3xl font-bold">{quality.claimsCount || 0}</p><p className="text-sm text-muted-foreground mt-2">Claims tracked with timestamp and service detail</p></CardContent></Card>
        </div>

        <Card className="shadow-sm border-border/50">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search claims, employers or employees..." className="pl-9 bg-background" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4"/> Filter</Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Date & Time</th>
                  <th className="px-6 py-4 font-medium">Employer / Employee</th>
                  <th className="px-6 py-4 font-medium">Service</th>
                  <th className="px-6 py-4 font-medium">Provider</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Receivable</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-muted-foreground">Loading claims…</td>
                  </tr>
                ) : claims.filter(c =>
                  `${c.employer || ''} ${c.employee_name || ''} ${c.service_name || ''}`
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()),
                ).length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-muted-foreground">No claims found.</td>
                  </tr>
                ) : claims.filter(c =>
                  `${c.employer || ''} ${c.employee_name || ''} ${c.service_name || ''}`
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()),
                ).map((c) => (
                  <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      {c.activity_at ? new Date(c.activity_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{c.employer}</div>
                      <div className="text-muted-foreground text-xs">{c.employee_name || c.employee_email}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{c.service_name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{c.provider_name}</td>
                    <td className="px-6 py-4">{getStatusBadge(c.status)}</td>
                    <td className="px-6 py-4 text-right font-semibold">${Number(c.receivable_amount || 0).toLocaleString()}</td>
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