import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, FileText, Plus, MoreHorizontal } from 'lucide-react';

const mockContracts = [
  { id: 'CTR-1092', employer: 'Acme Corp', type: 'PMPM', members: 1250, value: '$1.5M', expires: '2026-12-31', status: 'Active' },
  { id: 'CTR-1093', employer: 'TechFlow', type: 'Fixed Cost', members: 450, value: '$650k', expires: '2026-06-30', status: 'Renewal Pending' },
  { id: 'CTR-1088', employer: 'GlobalLogistics', type: 'PMPM', members: 3200, value: '$4.2M', expires: '2027-03-15', status: 'Active' },
];

export default function ContractManagementPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Contracts - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contract Management</h1>
            <p className="text-muted-foreground mt-1">Employer agreements and financial performance.</p>
          </div>
          <Button className="rounded-xl gap-2"><Plus className="h-4 w-4"/> New Contract</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="rounded-2xl border-none shadow-md bg-muted/20">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Active Contracts</p>
              <h3 className="text-3xl font-bold">142</h3>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-md bg-muted/20">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Value (Annual)</p>
              <h3 className="text-3xl font-bold">$42.5M</h3>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-md bg-warning/10 text-warning-foreground">
            <CardContent className="p-6">
              <p className="text-sm font-medium mb-1 opacity-80">Pending Renewals (90 Days)</p>
              <h3 className="text-3xl font-bold">8</h3>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/20 border-b">
            <CardTitle>Employer Contracts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6">Employer / Contract ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Annual Value</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right px-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockContracts.map((ctr) => (
                  <TableRow key={ctr.id}>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{ctr.employer}</div>
                          <div className="text-xs text-muted-foreground">{ctr.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{ctr.type}</TableCell>
                    <TableCell>{ctr.members.toLocaleString()}</TableCell>
                    <TableCell>{ctr.value}</TableCell>
                    <TableCell className="text-muted-foreground">{ctr.expires}</TableCell>
                    <TableCell>
                      {ctr.status === 'Active' ? (
                        <Badge variant="secondary" className="bg-success/10 text-success border-none">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-warning/10 text-warning border-none">Renewal</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-4 w-4"/></Button>
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