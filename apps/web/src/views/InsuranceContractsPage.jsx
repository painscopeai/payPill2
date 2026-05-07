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
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

export default function InsuranceContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employers, setEmployers] = useState([]);
  const [createForm, setCreateForm] = useState({
    employer_user_id: '',
    name: '',
    contract_type: 'ppo',
    member_count: '',
    contract_value: '',
    start_date: '',
    end_date: '',
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [contractsRes, employersRes] = await Promise.all([
          apiServerClient.fetch('/insurance/contracts'),
          apiServerClient.fetch('/admin/bulk/employer-options'),
        ]);
        const contractsBody = await contractsRes.json().catch(() => ({}));
        const employersBody = await employersRes.json().catch(() => ({}));
        if (!contractsRes.ok) throw new Error(contractsBody.error || 'Failed to load contracts');
        if (!employersRes.ok) throw new Error(employersBody.error || 'Failed to load employers');
        setContracts(contractsBody.items || []);
        setEmployers(employersBody.items || []);
      } catch (e) {
        toast.error(e.message || 'Failed to load contracts');
      } finally {
        setLoading(false);
      }
    })();
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
    void (async () => {
      try {
        const res = await apiServerClient.fetch('/insurance/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employer_user_id: createForm.employer_user_id,
            name: createForm.name.trim(),
            contract_type: createForm.contract_type,
            member_count: Number(createForm.member_count || 0),
            contract_value: Number(createForm.contract_value || 0),
            start_date: createForm.start_date || null,
            end_date: createForm.end_date || null,
            status: createForm.status,
            notes: createForm.notes || null,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Could not create contract');
        toast.success('Contract created successfully');
        setIsModalOpen(false);
        setCreateForm({
          employer_user_id: '',
          name: '',
          contract_type: 'ppo',
          member_count: '',
          contract_value: '',
          start_date: '',
          end_date: '',
          status: 'pending',
          notes: '',
        });
        const refresh = await apiServerClient.fetch('/insurance/contracts');
        const refreshBody = await refresh.json().catch(() => ({}));
        if (refresh.ok) setContracts(refreshBody.items || []);
      } catch (err) {
        toast.error(err.message || 'Failed to create contract');
      }
    })();
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
                      <Select value={createForm.employer_user_id} onValueChange={(v) => setCreateForm((p) => ({ ...p, employer_user_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select employer" /></SelectTrigger>
                        <SelectContent>
                          {employers.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.label || e.email || e.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Contract Name</Label>
                      <Input required placeholder="e.g. 2026 Employer Health Plan" value={createForm.name} onChange={(ev) => setCreateForm((p) => ({ ...p, name: ev.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contract Type</Label>
                        <Select value={createForm.contract_type} onValueChange={(v) => setCreateForm((p) => ({ ...p, contract_type: v }))}>
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
                        <Input type="number" required placeholder="e.g. 500" value={createForm.member_count} onChange={(ev) => setCreateForm((p) => ({ ...p, member_count: ev.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Total Contract Value ($)</Label>
                      <Input type="number" required placeholder="e.g. 1500000" value={createForm.contract_value} onChange={(ev) => setCreateForm((p) => ({ ...p, contract_value: ev.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input type="date" required value={createForm.start_date} onChange={(ev) => setCreateForm((p) => ({ ...p, start_date: ev.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input type="date" required value={createForm.end_date} onChange={(ev) => setCreateForm((p) => ({ ...p, end_date: ev.target.value }))} />
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
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-muted-foreground">Loading contracts…</td>
                  </tr>
                ) : contracts.filter(c => String(c.employer || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(c.id || '').toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-muted-foreground">No contracts found.</td>
                  </tr>
                ) : contracts.filter(c => String(c.employer || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(c.id || '').toLowerCase().includes(searchTerm.toLowerCase())).map((c) => (
                  <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{c.employer}</div>
                      <div className="text-muted-foreground text-xs">{c.id}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{String(c.type || '').toUpperCase()}</td>
                    <td className="px-6 py-4 text-foreground">{Number(c.members || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-foreground">${(Number(c.value || 0) / 1000000).toFixed(1)}M</td>
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