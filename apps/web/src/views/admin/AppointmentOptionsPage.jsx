import React, { useCallback, useEffect, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function AppointmentOptionsPage() {
  const authHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ---- Visit types ----
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

  // ---- Insurance ----
  const [insLoading, setInsLoading] = useState(true);
  const [insurance, setInsurance] = useState([]);
  const [insDialog, setInsDialog] = useState(false);
  const [insSaving, setInsSaving] = useState(false);
  const [insEditing, setInsEditing] = useState(null);
  const [insForm, setInsForm] = useState({
    slug: '',
    label: '',
    sort_order: 0,
    active: true,
    copay_estimate: '',
  });

  const loadInsurance = useCallback(async () => {
    setInsLoading(true);
    try {
      const res = await apiServerClient.fetch('/admin/insurance-options?include_inactive=1', {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load insurance options');
      }
      const data = await res.json();
      setInsurance(data.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setInsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVisitTypes();
    void loadInsurance();
  }, [loadVisitTypes, loadInsurance]);

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

  const saveInsurance = async () => {
    setInsSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      const copay =
        insForm.copay_estimate === '' || insForm.copay_estimate === null
          ? null
          : Number(insForm.copay_estimate);
      if (insEditing) {
        const res = await apiServerClient.fetch(`/admin/insurance-options/${insEditing.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            label: insForm.label,
            sort_order: Number(insForm.sort_order) || 0,
            active: insForm.active,
            copay_estimate: copay,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Update failed');
        }
        toast.success('Insurance option updated');
      } else {
        const res = await apiServerClient.fetch('/admin/insurance-options', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            slug: insForm.slug,
            label: insForm.label,
            sort_order: Number(insForm.sort_order) || 0,
            active: insForm.active,
            copay_estimate: copay,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Create failed');
        }
        toast.success('Insurance option created');
      }
      setInsDialog(false);
      await loadInsurance();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setInsSaving(false);
    }
  };

  const deactivateInsurance = async (row) => {
    if (!window.confirm(`Deactivate "${row.label}"?`)) return;
    try {
      const res = await apiServerClient.fetch(`/admin/insurance-options/${row.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Deactivate failed');
      }
      toast.success('Insurance option deactivated');
      await loadInsurance();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const vtColumns = [
    { key: 'slug', label: 'Slug' },
    { key: 'label', label: 'Label' },
    { key: 'sort_order', label: 'Order' },
    { key: 'active', label: 'Active', render: (r) => (r.active ? 'Yes' : 'No') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => {
            setVtEditing(row);
            setVtForm({
              slug: row.slug,
              label: row.label,
              sort_order: row.sort_order ?? 0,
              active: row.active !== false,
            });
            setVtDialog(true);
          }}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          {row.active ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => void deactivateVisitType(row)}>
              <Ban className="w-4 h-4 mr-1" />
              Deactivate
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const insColumns = [
    { key: 'slug', label: 'Slug' },
    { key: 'label', label: 'Label' },
    {
      key: 'copay_estimate',
      label: 'Est. copay ($)',
      render: (r) => (r.copay_estimate != null ? Number(r.copay_estimate).toFixed(2) : '—'),
    },
    { key: 'sort_order', label: 'Order' },
    { key: 'active', label: 'Active', render: (r) => (r.active ? 'Yes' : 'No') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setInsEditing(row);
              setInsForm({
                slug: row.slug,
                label: row.label,
                sort_order: row.sort_order ?? 0,
                active: row.active !== false,
                copay_estimate:
                  row.copay_estimate != null ? String(row.copay_estimate) : '',
              });
              setInsDialog(true);
            }}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          {row.active ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => void deactivateInsurance(row)}>
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
      <div>
        <h1 className="text-3xl font-bold font-display">Appointment options</h1>
        <p className="text-muted-foreground">
          Visit types and insurance plans shown to patients when booking. Providers listed on the booking form are
          active and verified — manage them under Provider Management.
        </p>
      </div>

      <Tabs defaultValue="visit-types" className="w-full">
        <TabsList>
          <TabsTrigger value="visit-types">Visit types</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
        </TabsList>

        <TabsContent value="visit-types" className="space-y-4 mt-4">
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
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Visit types</CardTitle>
              <CardDescription>Displayed in the patient “Schedule appointment” form.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={vtColumns} data={visitTypes} isLoading={vtLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setInsEditing(null);
                setInsForm({
                  slug: '',
                  label: '',
                  sort_order: 0,
                  active: true,
                  copay_estimate: '',
                });
                setInsDialog(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add insurance
            </Button>
          </div>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Insurance options</CardTitle>
              <CardDescription>Copay estimate is shown as guidance on the booking form.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={insColumns} data={insurance} isLoading={insLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              <Label>Label</Label>
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

      <Dialog open={insDialog} onOpenChange={setInsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{insEditing ? 'Edit insurance option' : 'New insurance option'}</DialogTitle>
            <DialogDescription>
              {insEditing ? 'Slug cannot be changed.' : 'Slug is permanent (lowercase, letters, numbers, hyphen).'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={insForm.slug}
                onChange={(e) => setInsForm({ ...insForm, slug: e.target.value })}
                disabled={!!insEditing}
                placeholder="e.g. aetna"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={insForm.label}
                onChange={(e) => setInsForm({ ...insForm, label: e.target.value })}
                placeholder="Display name"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated copay (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={insForm.copay_estimate}
                onChange={(e) => setInsForm({ ...insForm, copay_estimate: e.target.value })}
                placeholder="e.g. 25"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={insForm.sort_order}
                onChange={(e) => setInsForm({ ...insForm, sort_order: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ins-active"
                checked={insForm.active}
                onChange={(e) => setInsForm({ ...insForm, active: e.target.checked })}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="ins-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveInsurance()} disabled={insSaving}>
              {insSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {insEditing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
