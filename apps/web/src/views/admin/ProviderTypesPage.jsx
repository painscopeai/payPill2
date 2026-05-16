
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { toast } from 'sonner';
import { Plus, Loader2, Pencil } from 'lucide-react';
import { TableRowActionsMenu } from '@/components/admin/TableRowActionsMenu.jsx';
import { deleteMenuItem } from '@/lib/adminDeleteMenu.js';

const OPERATIONS_LABELS = {
  doctor: 'Clinical',
  pharmacist: 'Pharmacy',
  laboratory: 'Laboratory',
};

export default function ProviderTypesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    slug: '',
    label: '',
    sort_order: 0,
    active: true,
    operations_profile: 'doctor',
  });

  const authHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiServerClient.fetch('/admin/provider-types?include_inactive=1', {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load provider specialties');
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ slug: '', label: '', sort_order: 0, active: true, operations_profile: 'doctor' });
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      slug: row.slug,
      label: row.label,
      sort_order: row.sort_order ?? 0,
      active: row.active !== false,
      operations_profile: row.operations_profile || 'doctor',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      if (editing) {
        const res = await apiServerClient.fetch(`/admin/provider-types/${editing.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            label: form.label,
            sort_order: Number(form.sort_order) || 0,
            active: form.active,
            operations_profile: form.operations_profile,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Update failed');
        }
        toast.success('Provider specialty updated');
      } else {
        const res = await apiServerClient.fetch('/admin/provider-types', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            slug: form.slug,
            label: form.label,
            sort_order: Number(form.sort_order) || 0,
            active: form.active,
            operations_profile: form.operations_profile,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Create failed');
        }
        toast.success('Provider specialty created');
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (row, { silent = false } = {}) => {
    const res = await apiServerClient.fetch(`/admin/provider-types/${row.id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Delete failed');
    }
    if (!silent) {
      toast.success('Provider specialty deleted');
      await load();
    }
  };

  const columns = [
    { key: 'label', label: 'Description' },
    {
      key: 'operations_profile',
      label: 'Operations',
      render: (r) => OPERATIONS_LABELS[r.operations_profile] || r.operations_profile || '—',
    },
    {
      key: 'active',
      label: 'Active',
      render: (r) => (r.active ? 'Yes' : 'No'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <TableRowActionsMenu
          items={[
            { label: 'Edit', icon: Pencil, onClick: () => openEdit(row) },
            row.active
              ? deleteMenuItem({
                  displayName: row.label,
                  onDelete: async () => {
                    try {
                      await deactivate(row);
                    } catch (e) {
                      toast.error(e.message);
                    }
                  },
                  separatorBefore: true,
                })
              : null,
          ].filter(Boolean)}
        />
      ),
    },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Provider Specialties</h1>
          <p className="text-muted-foreground">
            Manage practice specialties used on applications, signup, and provider directory. Operations profile
            controls pharmacy inventory and patient shop (Pharmacy → pharmacist).
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add specialty
        </Button>
      </div>

      <Card className="w-full border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>All specialties</CardTitle>
          <CardDescription>
            <Link to="/admin/providers" className="text-primary underline-offset-4 hover:underline">
              Back to provider directory
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={items}
            isLoading={loading}
            selectable
            onDeleteRows={async (rows) => {
              try {
                const active = rows.filter((row) => row.active);
                for (const row of active) {
                  await deactivate(row, { silent: true });
                }
                toast.success(
                  active.length === 1 ? 'Provider specialty deleted' : `Deleted ${active.length} specialties`,
                );
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Delete failed');
              }
            }}
            getRowDeleteLabel={(r) => r.label || 'specialty'}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit provider specialty' : 'New provider specialty'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Slug cannot be changed. Update label, operations profile, display order, or active flag.'
                : 'Slug is permanent (lowercase, letters, numbers, hyphen, underscore).'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                disabled={!!editing}
                placeholder="e.g. imaging_center"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Display name"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Operations profile</Label>
              <Select
                value={form.operations_profile}
                onValueChange={(v) => setForm({ ...form, operations_profile: v })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Clinical (doctor)</SelectItem>
                  <SelectItem value="pharmacist">Pharmacy (inventory & shop)</SelectItem>
                  <SelectItem value="laboratory">Laboratory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort order (dropdowns only)</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pt-active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="pt-active">Active (shown in signup & onboarding)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

