import React, { useCallback, useEffect, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { SearchBar } from '@/components/admin/SearchBar.jsx';
import { ExportButton } from '@/components/admin/ExportButton.jsx';
import { FilterPanel } from '@/components/admin/FilterPanel.jsx';
import { StatusBadge } from '@/components/admin/StatusBadge.jsx';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Building2, Eye, Ban, CheckCircle, Trash2, Save, UserPlus } from 'lucide-react';
import { TableRowActionsMenu } from '@/components/admin/TableRowActionsMenu.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function employerLabel(p) {
  return p.company_name || p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || p.id;
}

export default function EmployersManagementPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editForm, setEditForm] = useState({ company_name: '', phone: '', subscription_plan: '' });
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ company_name: '', email: '', phone: '', password: '' });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({ role: 'employer', page: String(page), pageSize: '10' });
      if (searchTerm) q.set('search', searchTerm);
      if (statusFilter !== 'all') q.set('status', statusFilter);
      const res = await apiServerClient.fetch(`/admin/users?${q.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to load employers');
      setData(body.items || []);
      setTotalPages(body.totalPages || 1);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to fetch employers');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleAction = async (id, action) => {
    try {
      const newStatus = action === 'suspend' ? 'inactive' : 'active';
      const res = await apiServerClient.fetch(`/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Action failed');
      toast.success(`Employer ${newStatus}`);
      void fetchData();
    } catch (e) {
      toast.error(e.message || 'Action failed');
    }
  };

  const deleteEmployer = async (id) => {
    if (!window.confirm('Soft-disable this employer account? They will no longer be able to sign in.')) return;
    try {
      const res = await apiServerClient.fetch(`/admin/users/${id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Delete failed');
      toast.success('Employer deactivated');
      void fetchData();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const createEmployer = async () => {
    if (!createForm.company_name || !createForm.email || !createForm.password) {
      toast.error('Company name, email, and temporary password are required');
      return;
    }
    setCreating(true);
    try {
      const res = await apiServerClient.fetch('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'employer',
          company_name: createForm.company_name,
          email: createForm.email,
          phone: createForm.phone || null,
          password: createForm.password,
          status: 'active',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Create failed');
      toast.success('Employer account created');
      setCreateOpen(false);
      setCreateForm({ company_name: '', email: '', phone: '', password: '' });
      void fetchData();
    } catch (e) {
      toast.error(e.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const openDetails = (row) => {
    setSelectedEmployer(row);
    setEditForm({
      company_name: row.company_name || '',
      phone: row.phone || '',
      subscription_plan: row.subscription_plan || '',
    });
    setIsDetailsOpen(true);
  };

  const saveEdit = async () => {
    if (!selectedEmployer) return;
    setSaving(true);
    try {
      const res = await apiServerClient.fetch(`/admin/users/${selectedEmployer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Save failed');
      toast.success('Employer updated');
      setIsDetailsOpen(false);
      void fetchData();
    } catch (e) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'company', label: 'Company', sortable: true, render: (row) => (
      <div>
        <div className="font-medium">{employerLabel(row)}</div>
        <div className="text-xs text-muted-foreground">{row.email}</div>
      </div>
    ) },
    { key: 'employee_count', label: 'Employees', render: (row) => row.employee_count ?? 0 },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status || 'active'} />
    },
    {
      key: 'created_at',
      label: 'Registered',
      render: (row) => row.created_at ? format(new Date(row.created_at), 'MMM d, yyyy') : '—'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <TableRowActionsMenu
          items={[
            { label: 'View / Edit', icon: Eye, onClick: () => openDetails(row) },
            row.status === 'active'
              ? {
                  label: 'Suspend',
                  icon: Ban,
                  onClick: () => handleAction(row.id, 'suspend'),
                  className: 'text-warning',
                  separatorBefore: true,
                }
              : {
                  label: 'Activate',
                  icon: CheckCircle,
                  onClick: () => handleAction(row.id, 'activate'),
                  className: 'text-success',
                  separatorBefore: true,
                },
            {
              label: 'Soft-disable',
              icon: Trash2,
              onClick: () => deleteEmployer(row.id),
              destructive: true,
              separatorBefore: true,
            },
          ]}
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Employers Management</h1>
          <p className="text-muted-foreground">Manage corporate clients and their subscriptions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)}><UserPlus className="w-4 h-4 mr-2" /> Add employer</Button>
          <ExportButton data={data} filename="employers" />
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
            <SearchBar
              placeholder="Search companies..."
              onSearch={(t) => { setSearchTerm(t); setPage(1); }}
              className="w-full sm:w-96"
            />
            <FilterPanel activeFiltersCount={statusFilter !== 'all' ? 1 : 0} onReset={() => setStatusFilter('all')}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FilterPanel>
          </div>

          <div className="p-4">
            <DataTable
              columns={columns}
              data={data}
              isLoading={isLoading}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {selectedEmployer ? employerLabel(selectedEmployer) : 'Employer'} Details
            </DialogTitle>
            <DialogDescription>Full corporate profile and subscription details.</DialogDescription>
          </DialogHeader>
          {selectedEmployer && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedEmployer.email || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Employees</p>
                  <p className="font-medium">{selectedEmployer.employee_count || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Subscription Status</p>
                  <p className="font-medium">{selectedEmployer.subscription_status || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={selectedEmployer.status || 'active'} className="mt-1" />
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <h4 className="font-medium">Edit details</h4>
                <div className="space-y-2">
                  <Label>Company name</Label>
                  <Input
                    value={editForm.company_name}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subscription plan</Label>
                  <Input
                    value={editForm.subscription_plan}
                    onChange={(e) => setEditForm({ ...editForm, subscription_plan: e.target.value })}
                    placeholder="e.g. Standard"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
            <Button onClick={saveEdit} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Create employer account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Company name</Label>
              <Input value={createForm.company_name} onChange={(e) => setCreateForm((p) => ({ ...p, company_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <Input value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createEmployer} disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
