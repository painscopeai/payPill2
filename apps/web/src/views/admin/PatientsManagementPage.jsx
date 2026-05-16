import React, { useCallback, useEffect, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Download, UserX, UserCheck, Trash2, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableRowActionsMenu } from '@/components/admin/TableRowActionsMenu.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

function fullName(p) {
  const first = (p.first_name || '').trim();
  const last = (p.last_name || '').trim();
  const composed = [first, last].filter(Boolean).join(' ');
  if (composed) return composed;
  return p.name || p.email || p.id;
}

function statusBadgeClasses(status) {
  const v = String(status || 'active').toLowerCase();
  if (v === 'active') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (v === 'draft') return 'bg-amber-100 text-amber-800 border border-amber-200';
  if (v === 'inactive') return 'bg-slate-100 text-slate-700 border border-slate-200';
  if (v === 'suspended') return 'bg-rose-100 text-rose-800 border border-rose-200';
  if (v === 'pending') return 'bg-blue-100 text-blue-800 border border-blue-200';
  return 'bg-slate-100 text-slate-700 border border-slate-200';
}

export default function PatientsManagementPage() {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ first_name: '', last_name: '', email: '', password: '' });

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        role: 'individual',
        page: String(page),
        pageSize: '10',
      });
      if (searchTerm) q.set('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') q.set('status', statusFilter);
      const res = await apiServerClient.fetch(`/admin/users?${q.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to load patients');
      setPatients(body.items || []);
      setTotalPages(body.totalPages || 1);
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error(error.message || 'Failed to load patients');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => { void fetchPatients(); }, 300);
    return () => clearTimeout(t);
  }, [fetchPatients]);

  const updateStatus = async (id, status) => {
    try {
      const res = await apiServerClient.fetch(`/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Update failed');
      toast.success(`Patient ${status}`);
      void fetchPatients();
    } catch (e) {
      toast.error(e.message || 'Update failed');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Soft-disable this patient account? They will no longer be able to sign in.')) return;
    try {
      const res = await apiServerClient.fetch(`/admin/users/${id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Delete failed');
      toast.success('Patient deactivated');
      void fetchPatients();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const createPatient = async () => {
    if (!createForm.email || !createForm.first_name || !createForm.last_name || !createForm.password) {
      toast.error('First name, last name, email, and temporary password are required');
      return;
    }
    setCreating(true);
    try {
      const res = await apiServerClient.fetch('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, role: 'individual', status: 'active' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Create failed');
      toast.success('Patient account created');
      setCreateOpen(false);
      setCreateForm({ first_name: '', last_name: '', email: '', password: '' });
      void fetchPatients();
    } catch (e) {
      toast.error(e.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const handleExport = () => {
    const rows = [
      ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Registered'],
      ...patients.map((p) => [
        p.first_name || '',
        p.last_name || '',
        p.email || '',
        p.phone || '',
        p.status || 'active',
        p.created_at ? format(new Date(p.created_at), 'yyyy-MM-dd') : '',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patients.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Patients Management</h1>
          <p className="text-muted-foreground">View and manage patient accounts and records.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Add patient
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="admin-card-shadow border-none">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or phone..."
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Patient</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Registered</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <LoadingSpinner size="md" />
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-muted-foreground">
                      No patients found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr key={patient.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{fullName(patient)}</div>
                        <div className="text-xs text-muted-foreground">ID: {patient.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{patient.email}</div>
                        <div className="text-muted-foreground">{patient.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={statusBadgeClasses(patient.status)}>
                          {patient.status || 'active'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {patient.created_at ? format(new Date(patient.created_at), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <TableRowActionsMenu
                          items={[
                            patient.status === 'active'
                              ? {
                                  label: 'Deactivate Account',
                                  icon: UserX,
                                  onClick: () => updateStatus(patient.id, 'inactive'),
                                  className: 'text-warning',
                                }
                              : {
                                  label: 'Reactivate Account',
                                  icon: UserCheck,
                                  onClick: () => updateStatus(patient.id, 'active'),
                                  className: 'text-success',
                                },
                            {
                              label: 'Soft-disable',
                              icon: Trash2,
                              onClick: () => deleteUser(patient.id),
                              destructive: true,
                              separatorBefore: true,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create patient account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First name</Label>
                <Input value={createForm.first_name} onChange={(e) => setCreateForm((p) => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Last name</Label>
                <Input value={createForm.last_name} onChange={(e) => setCreateForm((p) => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Temporary password</Label>
              <Input value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createPatient} disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
