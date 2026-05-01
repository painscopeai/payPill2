import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Download, CreditCard, Filter, ArrowRight } from 'lucide-react';

export default function InsurancePaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const payments = [
    { id: 'PAY-10023', recipient: 'General Hospital', amount: 14500.00, status: 'processed', date: '2026-04-22', type: 'Medical Claim' },
    { id: 'PAY-10024', recipient: 'Acme Pharmacy', amount: 840.50, status: 'processed', date: '2026-04-22', type: 'Pharmacy Claim' },
    { id: 'PAY-10025', recipient: 'Dr. Sarah Jenkins', amount: 250.00, status: 'pending', date: '2026-04-23', type: 'Provider Remit' },
    { id: 'PAY-10026', recipient: 'City MRI Center', amount: 1200.00, status: 'failed', date: '2026-04-23', type: 'Medical Claim' },
    { id: 'PAY-10027', recipient: 'Wellness Clinic', amount: 450.00, status: 'processed', date: '2026-04-21', type: 'Preventive' },
  ];

  const getStatusBadge = (status) => {
    switch(status) {
      case 'processed': return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Processed</Badge>;
      case 'failed': return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">Failed</Badge>;
      case 'pending': return <Badge variant="outline" className="text-orange-500 border-orange-500/30">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Payments & Claims - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Operations</h1>
            <p className="text-muted-foreground">Manage claim payouts, provider remittances, and employer billing.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Statements</Button>
            <Button className="gap-2"><CreditCard className="h-4 w-4" /> Issue Payment</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Processed YTD</p>
              <p className="text-3xl font-bold mt-2">$24.5M</p>
              <p className="text-sm text-muted-foreground mt-2">14,230 transactions</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
              <p className="text-3xl font-bold mt-2 text-orange-500">$842K</p>
              <p className="text-sm text-muted-foreground mt-2">124 items in queue</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Failed Transfers</p>
              <p className="text-3xl font-bold mt-2 text-destructive">3</p>
              <p className="text-sm text-muted-foreground mt-2">Requires manual review</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Avg Processing Time</p>
              <p className="text-3xl font-bold mt-2">4.2 days</p>
              <p className="text-sm text-emerald-600 mt-2 font-medium">-1.1 days vs SLA</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-border/50">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search payment ID or recipient..." className="pl-9 bg-background" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto"><Filter className="h-4 w-4"/> Filter</Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Payment ID</th>
                  <th className="px-6 py-4 font-medium">Recipient</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{p.id}</td>
                    <td className="px-6 py-4 text-foreground">{p.recipient}</td>
                    <td className="px-6 py-4 text-muted-foreground">{p.type}</td>
                    <td className="px-6 py-4 text-foreground font-medium">${p.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-6 py-4 text-muted-foreground">{p.date}</td>
                    <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-primary">View <ArrowRight className="ml-1 h-4 w-4" /></Button>
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