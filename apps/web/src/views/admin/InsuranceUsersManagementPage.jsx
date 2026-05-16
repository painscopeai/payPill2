import React, { useCallback, useEffect, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { SearchBar } from '@/components/admin/SearchBar.jsx';
import { ExportButton } from '@/components/admin/ExportButton.jsx';
import { StatusBadge } from '@/components/admin/StatusBadge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Ban, CheckCircle, Trash2, Eye, Save, UserPlus } from 'lucide-react';
import { TableRowActionsMenu } from '@/components/admin/TableRowActionsMenu.jsx';
import { deleteMenuItem } from '@/lib/adminDeleteMenu.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function insLabel(p) {
  return p.company_name || p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || p.id;
}

export default function InsuranceUsersManagementPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ company_name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ company_name: '', email: '', phone: '', password: '' });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({ role: 'insurance', page: String(page), pageSize: '10' });
      if (searchTerm) q.set('search', searchTerm);
      if (statusFilter !== 'all') q.set('status', statusFilter);
      const res = await apiServerClient.fetch(`/admin/users?${q.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to load insurance partners');
      setData(body.items || []);
      setTotalPages(body.totalPages || 1);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to fetch insurance partners');
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
      toast.success(`Insurance partner ${newStatus}`);
      void fetchData();
    } catch (e) {
      toast.error(e.message || 'Action failed');
    }
  };

  const deleteRow = async (id) => {
    const res = await apiServerClient.fetch(`/admin/users/${id}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Delete failed');
  };

  const removeRow = async (row) => {
    try {
      await deleteRow(row.id);
      toast.success('Insurance partner deleted');
      void fetchData();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const handleDeleteRows = async (rows) => {
    try {
      for (const row of rows) {
        await deleteRow(row.id);
      }
      toast.success(
        rows.length === 1 ? 'Insurance partner deleted' : `Deleted ${rows.length} insurance accounts`,
      );
      void fetchData();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const createInsurance = async () => {
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
          role: 'insurance',
          company_name: createForm.company_name.trim(),
          email: createForm.email.trim().toLowerCase(),
          phone: createForm.phone.trim() || null,
          password: createForm.password,
          status: 'active',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Create failed');
      toast.success('Insurance account created');
      setCreateOpen(false);
      setCreateForm({ company_name: '', email: '', phone: '', password: '' });
      void fetchData();
    } catch (e) {
      toast.error(e.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (row) => {
    setEditing(row);
    setEditForm({ company_name: row.company_name || '', phone: row.phone || '' });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await apiServerClient.fetch(`/admin/users/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Save failed');
      toast.success('Insurance partner updated');
      setEditing(null);
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
        <div className="font-medium">{insLabel(row)}</div>
        <div className="text-xs text-muted-foreground">{row.email}</div>
      </div>
    ) },
    { key: 'phone', label: 'Phone', render: (row) => row.phone || '—' },
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
            { label: 'View / Edit', icon: Eye, onClick: () => openEdit(row) },
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
            deleteMenuItem({
              displayName: insLabel(row),
              onDelete: () => removeRow(row),
              message:
                'Delete this insurance account? They will no longer be able to sign in.',
            }),
          ]}
        />
      )
    }
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Insurance Management</h1>
          <p className="text-muted-foreground">Manage insurance providers and contracts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)}><UserPlus className="w-4 h-4 mr-2" /> Add insurance</Button>
          <ExportButton data={data} filename="insurance_users" />
        </div>
      </div>

      <Card className="w-full border-none shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <SearchBar
              placeholder="Search insurance partners..."
              onSearch={(t) => { setSearchTerm(t); setPage(1); }}
              className="max-w-md w-full"
            />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-4">
            <DataTable
              columns={columns}
              data={data}
              isLoading={isLoading}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              selectable
              onDeleteRows={handleDeleteRows}
              getRowDeleteLabel={(r) => insLabel(r)}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={editing != null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit insurance partner</DialogTitle>
            <DialogDescription>{editing ? insLabel(editing) : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Close</Button>
            <Button onClick={saveEdit} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create insurance account</DialogTitle>
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
            <Button onClick={createInsurance} disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

