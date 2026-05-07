import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download, TrendingDown } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { exportToCSV } from '@/lib/csvExport';

export default function EmployerCostsPage() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (fromDate) qs.set('from', fromDate);
      if (toDate) qs.set('to', toDate);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const res = await apiServerClient.fetch(`/employer/costs${suffix}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to load employer costs');
      setPayload(body);
    } catch (e) {
      toast.error(e.message || 'Failed to load costs');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void loadData();
    const t = window.setInterval(() => void loadData(), 30000);
    return () => window.clearInterval(t);
  }, [loadData]);

  const monthlyCosts = payload?.monthlyCosts || [];
  const topServices = payload?.topServices || [];
  const employeeCostTable = payload?.employeeCostTable || [];
  const activityLog = payload?.activityLog ?? [];
  const kpis = payload?.kpis || {
    totalHealthcareCosts: 0,
    totalSavings: 0,
    avgCostPerEmployee: 0,
    pharmacySpendPercent: 0,
    patientsReceivedCare: 0,
    totalActivities: 0,
    highOccurringService: 'N/A',
    highOccurringServiceCount: 0,
    careUtilizationRate: 0,
  };
  const filteredActivities = activityLog.slice(0, 200);
  const handleExportStatement = () => {
    const rows = filteredActivities.map((row) => ({
      date_time: row.activityAt ? new Date(row.activityAt).toLocaleString() : '',
      employee_name: row.employeeName || '',
      employee_email: row.employeeEmail || '',
      department: row.department || '',
      service: row.serviceName || '',
      provider: row.providerName || '',
      status: row.status || '',
      cost: Number(row.cost || 0),
    }));
    exportToCSV(rows, `employer-cost-statement-${fromDate || 'all'}-${toDate || 'all'}`);
    toast.success('Statement CSV exported');
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
          <div className="flex flex-wrap gap-2">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[170px]" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[170px]" />
            <Button variant="outline" className="gap-2" onClick={handleExportStatement}><Download className="h-4 w-4" /> Download Statement</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Healthcare Costs</p>
              <p className="text-3xl font-bold text-foreground">{loading ? '—' : `$${Number(kpis.totalHealthcareCosts || 0).toLocaleString()}`}</p>
              <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium">
                <TrendingDown className="h-4 w-4 mr-1" /> Real-time from appointment services
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50 bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-primary mb-1">Total Savings YTD</p>
              <p className="text-3xl font-bold text-primary">{loading ? '—' : `$${Number(kpis.totalSavings || 0).toLocaleString()}`}</p>
              <div className="mt-4 flex items-center text-sm text-primary font-medium">
                <TrendingDown className="h-4 w-4 mr-1" /> Optimization signals from care activity
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Avg Cost per Employee</p>
              <p className="text-3xl font-bold text-foreground">{loading ? '—' : `$${Number(kpis.avgCostPerEmployee || 0).toLocaleString()}`}</p>
              <p className="text-sm text-muted-foreground mt-4">{Number(kpis.patientsReceivedCare || 0)} patients received care</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Pharmacy Spend %</p>
              <p className="text-3xl font-bold text-foreground">{loading ? '—' : `${Number(kpis.pharmacySpendPercent || 0).toFixed(1)}%`}</p>
              <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium">
                <TrendingDown className="h-4 w-4 mr-1" /> Top service: {kpis.highOccurringService} ({kpis.highOccurringServiceCount})
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Activities</p>
              <p className="text-3xl font-bold text-foreground">{loading ? '—' : Number(kpis.totalActivities || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-3">Booked/processed service activities</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Care Utilization Rate</p>
              <p className="text-3xl font-bold text-foreground">{loading ? '—' : `${Number(kpis.careUtilizationRate || 0).toFixed(1)}%`}</p>
              <p className="text-sm text-muted-foreground mt-3">Patients who used care / active employees</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">High Occurring Service</p>
              <p className="text-xl font-semibold text-foreground truncate">{kpis.highOccurringService || 'N/A'}</p>
              <p className="text-sm text-muted-foreground mt-3">{Number(kpis.highOccurringServiceCount || 0)} occurrences</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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
              <CardTitle>Top Occurring Services</CardTitle>
              <CardDescription>Most frequently used service lines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topServices.map((s) => ({ name: s.name, value: s.count }))} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} formatter={(value) => `${value.toLocaleString()} occurrences`} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-border/50 mb-8">
          <CardHeader>
            <CardTitle>Employee Cost Table</CardTitle>
            <CardDescription>Costs incurred by each employee from provider services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Visits</th>
                    <th className="px-4 py-3 font-medium">Avg Cost</th>
                    <th className="px-4 py-3 font-medium">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employeeCostTable.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No cost records found for this period.</td></tr>
                  ) : employeeCostTable.map((row) => (
                    <tr key={`${row.employeeEmail}-${row.employeeName}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{row.employeeEmail}</div>
                      </td>
                      <td className="px-4 py-3">{row.department || '—'}</td>
                      <td className="px-4 py-3">{row.visitCount}</td>
                      <td className="px-4 py-3">${Number(row.avgCost || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium">${Number(row.totalCost || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Date/time-level tracking of services and costs incurred</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date & Time</th>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Provider</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredActivities.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No activity records found for this period.</td></tr>
                  ) : filteredActivities.map((row) => (
                    <tr key={row.appointmentId}>
                      <td className="px-4 py-3">{row.activityAt ? new Date(row.activityAt).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3">{row.employeeName || row.employeeEmail || 'Unknown'}</td>
                      <td className="px-4 py-3">{row.serviceName}</td>
                      <td className="px-4 py-3">{row.providerName}</td>
                      <td className="px-4 py-3">{row.status}</td>
                      <td className="px-4 py-3 font-medium">${Number(row.cost || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}