import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Filter, MoreHorizontal, Download, FileText, CalendarDays } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

export default function InsuranceContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Mock data for UI functionality
    setContracts([
      { id: 'CTR-2024-001', employer: 'Acme Corp', type: 'PPO', members: 1250, value: 4500000, start: '2024-01-01', end: '2025-12-31', status: 'active' },
      { id: 'CTR-2024-002', employer: 'TechFlow', type: 'HDHP', members: 340, value: 1200000, start: '2024-06-01', end: '2025-05-31', status: 'active' },
      { id: 'CTR-2023-088', employer: 'GlobalNet', type: 'HMO', members: 890, value: 3100000, start: '2023-01-01', end: '2023-12-31', status: 'expired' },
      { id: 'CTR-2024-045', employer: 'CityGov', type: 'PPO', members: 5200, value: 18500000, start: '2024-09-01', end: '2026-08-31', status: 'pending' },
    ]);
  }, []);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Active</Badge>;
      case 'expired': return <Badge variant="secondary" className="text-muted-foreground">Expired</Badge>;
      case 'pending': return <Badge variant="outline" className="text-orange-500 border-orange-500/30">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    toast.success('Contract created successfully');
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Contracts - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contract Management</h1>
            <p className="text-muted-foreground">Manage employer group policies and performance.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button variant="outline" className="gap-2 hidden sm:flex"><Download className="h-4 w-4" /> Export</Button>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" /> New Contract</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>Create Group Contract</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Employer Name</Label>
                      <Input required placeholder="Enter company name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contract Type</Label>
                        <Select defaultValue="ppo">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ppo">PPO</SelectItem>
                            <SelectItem value="hmo">HMO</SelectItem>
                            <SelectItem value="hdhp">HDHP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Est. Member Count</Label>
                        <Input type="number" required placeholder="e.g. 500" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Total Contract Value ($)</Label>
                      <Input type="number" required placeholder="e.g. 1500000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input type="date" required />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="submit">Create Contract</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="shadow-sm border-border/50">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search contracts or employers..." className="pl-9 bg-background" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4"/> Filter</Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Contract ID / Employer</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Members</th>
                  <th className="px-6 py-4 font-medium">Contract Value</th>
                  <th className="px-6 py-4 font-medium hidden md:table-cell">Duration</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contracts.filter(c => c.employer.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                  <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{c.employer}</div>
                      <div className="text-muted-foreground text-xs">{c.id}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{c.type}</td>
                    <td className="px-6 py-4 text-foreground">{c.members.toLocaleString()}</td>
                    <td className="px-6 py-4 text-foreground">${(c.value / 1000000).toFixed(1)}M</td>
                    <td className="px-6 py-4 text-muted-foreground text-xs hidden md:table-cell">
                      {c.start} to {c.end}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(c.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem><FileText className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                          <DropdownMenuItem><CalendarDays className="h-4 w-4 mr-2" /> Renew Contract</DropdownMenuItem>
                          <DropdownMenuItem><Download className="h-4 w-4 mr-2" /> Download PDF</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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