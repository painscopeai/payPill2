import React, { useCallback, useEffect, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { TableRowActionsMenu } from '@/components/admin/TableRowActionsMenu.jsx';

export default function AppointmentOptionsPage() {
  const authHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [vtLoading, setVtLoading] = useState(true);
  const [visitTypes, setVisitTypes] = useState([]);
  const [vtDialog, setVtDialog] = useState(false);
  const [vtSaving, setVtSaving] = useState(false);
  const [vtEditing, setVtEditing] = useState(null);
  const [vtForm, setVtForm] = useState({ slug: '', label: '', sort_order: 0, active: true });

  const loadVisitTypes = useCallback(async () => {
    setVtLoading(true);
    try {
      const res = await apiServerClient.fetch('/admin/visit-types?include_inactive=1', {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load visit types');
      }
      const data = await res.json();
      setVisitTypes(data.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setVtLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVisitTypes();
  }, [loadVisitTypes]);

  const saveVisitType = async () => {
    setVtSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      if (vtEditing) {
        const res = await apiServerClient.fetch(`/admin/visit-types/${vtEditing.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            label: vtForm.label,
            sort_order: Number(vtForm.sort_order) || 0,
            active: vtForm.active,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Update failed');
        }
        toast.success('Visit type updated');
      } else {
        const res = await apiServerClient.fetch('/admin/visit-types', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            slug: vtForm.slug,
            label: vtForm.label,
            sort_order: Number(vtForm.sort_order) || 0,
            active: vtForm.active,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Create failed');
        }
        toast.success('Visit type created');
      }
      setVtDialog(false);
      await loadVisitTypes();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setVtSaving(false);
    }
  };

  const deactivateVisitType = async (row) => {
    if (!window.confirm(`Deactivate "${row.label}"?`)) return;
    try {
      const res = await apiServerClient.fetch(`/admin/visit-types/${row.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Deactivate failed');
      }
      toast.success('Visit type deactivated');
      await loadVisitTypes();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const vtColumns = [
    { key: 'label', label: 'Description' },
    { key: 'active', label: 'Active', render: (r) => (r.active ? 'Yes' : 'No') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <TableRowActionsMenu
          items={[
            {
              label: 'Edit',
              icon: Pencil,
              onClick: () => {
                setVtEditing(row);
                setVtForm({
                  slug: row.slug,
                  label: row.label,
                  sort_order: row.sort_order ?? 0,
                  active: row.active !== false,
                });
                setVtDialog(true);
              },
            },
            row.active
              ? {
                  label: 'Deactivate',
                  icon: Ban,
                  onClick: () => void deactivateVisitType(row),
                  className: 'text-warning',
                  separatorBefore: true,
                }
              : null,
          ].filter(Boolean)}
        />
      ),
    },
  ];

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Appointment options</h1>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            setVtEditing(null);
            setVtForm({ slug: '', label: '', sort_order: 0, active: true });
            setVtDialog(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add visit type
        </Button>
      </div>

      <Card className="w-full border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>Visit types</CardTitle>
          <CardDescription>Displayed in the patient “Schedule appointment” form.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={vtColumns} data={visitTypes} isLoading={vtLoading} />
        </CardContent>
      </Card>

      <Dialog open={vtDialog} onOpenChange={setVtDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{vtEditing ? 'Edit visit type' : 'New visit type'}</DialogTitle>
            <DialogDescription>
              {vtEditing ? 'Slug cannot be changed.' : 'Slug is permanent (lowercase, letters, numbers, hyphen).'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={vtForm.slug}
                onChange={(e) => setVtForm({ ...vtForm, slug: e.target.value })}
                disabled={!!vtEditing}
                placeholder="e.g. follow-up"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={vtForm.label}
                onChange={(e) => setVtForm({ ...vtForm, label: e.target.value })}
                placeholder="Display name"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={vtForm.sort_order}
                onChange={(e) => setVtForm({ ...vtForm, sort_order: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="vt-active"
                checked={vtForm.active}
                onChange={(e) => setVtForm({ ...vtForm, active: e.target.checked })}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="vt-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVtDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveVisitType()} disabled={vtSaving}>
              {vtSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {vtEditing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

