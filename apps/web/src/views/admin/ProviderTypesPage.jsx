
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Loader2, Pencil, Ban } from 'lucide-react';

export default function ProviderTypesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ slug: '', label: '', sort_order: 0, active: true });

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
        throw new Error(err.error || 'Failed to load provider types');
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
    setForm({ slug: '', label: '', sort_order: 0, active: true });
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      slug: row.slug,
      label: row.label,
      sort_order: row.sort_order ?? 0,
      active: row.active !== false,
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
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Update failed');
        }
        toast.success('Provider type updated');
      } else {
        const res = await apiServerClient.fetch('/admin/provider-types', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            slug: form.slug,
            label: form.label,
            sort_order: Number(form.sort_order) || 0,
            active: form.active,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Create failed');
        }
        toast.success('Provider type created');
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (row) => {
    if (!window.confirm(`Deactivate "${row.label}"? Existing records keep slug "${row.slug}".`)) return;
    try {
      const res = await apiServerClient.fetch(`/admin/provider-types/${row.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Deactivate failed');
      }
      toast.success('Provider type deactivated');
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const columns = [
    { key: 'slug', label: 'Slug' },
    { key: 'label', label: 'Label' },
    { key: 'sort_order', label: 'Order' },
    {
      key: 'active',
      label: 'Active',
      render: (r) => (r.active ? 'Yes' : 'No'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => openEdit(row)}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          {row.active ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => void deactivate(row)}>
              <Ban className="w-4 h-4 mr-1" />
              Deactivate
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Provider types</h1>
          <p className="text-muted-foreground">
            Manage taxonomy used on provider applications and provider records. Slugs are stored in the database;
            changing labels is safe; deactivating hides a type from new applications.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add type
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>All types</CardTitle>
          <CardDescription>
            <Link to="/admin/provider-onboarding" className="text-primary underline-offset-4 hover:underline">
              Back to provider onboarding
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={items} isLoading={loading} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit provider type' : 'New provider type'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Slug cannot be changed. Update label, display order, or active flag.'
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
              <Label>Label</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Display name"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
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
              <Label htmlFor="pt-active">Active (shown in onboarding)</Label>
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
