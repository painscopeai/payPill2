import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/admin/DataTable.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, Loader2, Pencil, Ban, ListTree, Search, Database, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { TableRowActionsMenu } from '@/components/admin/TableRowActionsMenu.jsx';
import { PROFILE_OPTION_GROUP_LABELS as GROUP_LABELS } from '@/lib/profileOptionGroupLabels';
import { cn } from '@/lib/utils';

const GROUP_ORDER = [
  'welcome',
  'demographics',
  'vitals',
  'conditions',
  'medications',
  'allergies',
  'family_history',
  'immunizations',
  'labs',
  'lifestyle',
  'providers',
  'insurance',
  'emergency',
  'general',
];

export default function ProfileReferenceDataPage() {
  const authHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState([]);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [groupsCollapsed, setGroupsCollapsed] = useState(false);

  const [valuesOpen, setValuesOpen] = useState(false);
  const [activeSet, setActiveSet] = useState(null);
  const [values, setValues] = useState([]);
  const [valuesLoading, setValuesLoading] = useState(false);

  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [setSaving, setSetSaving] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [setForm, setSetForm] = useState({
    key: '',
    label: '',
    group_slug: 'general',
    sort_order: 0,
    active: true,
  });

  const [valDialogOpen, setValDialogOpen] = useState(false);
  const [valSaving, setValSaving] = useState(false);
  const [editingVal, setEditingVal] = useState(null);
  const [valForm, setValForm] = useState({ slug: '', label: '', sort_order: 0, active: true });

  const loadSets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiServerClient.fetch('/admin/profile-option-sets?include_inactive=1', {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load sets');
      }
      const data = await res.json();
      setSets(data.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  const loadValues = async (setId) => {
    setValuesLoading(true);
    try {
      const res = await apiServerClient.fetch(
        `/admin/profile-option-values?set_id=${encodeURIComponent(setId)}&include_inactive=1`,
        { headers: await authHeaders() },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load values');
      }
      const data = await res.json();
      setValues(data.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setValuesLoading(false);
    }
  };

  const openValues = async (row) => {
    setActiveSet(row);
    setValuesOpen(true);
    await loadValues(row.id);
  };

  const filteredSets = useMemo(() => {
    let rows = sets;
    if (groupFilter !== 'all') {
      rows = rows.filter((r) => r.group_slug === groupFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.key.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q) ||
        (r.group_slug || '').toLowerCase().includes(q),
    );
  }, [sets, search, groupFilter]);

  const groupCounts = useMemo(() => {
    const m = {};
    for (const r of sets) {
      const g = r.group_slug || 'general';
      m[g] = (m[g] || 0) + 1;
    }
    return m;
  }, [sets]);

  const saveSet = async () => {
    setSetSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      if (editingSet) {
        const res = await apiServerClient.fetch(`/admin/profile-option-sets/${editingSet.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            label: setForm.label,
            group_slug: setForm.group_slug,
            sort_order: Number(setForm.sort_order) || 0,
            active: setForm.active,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Update failed');
        }
        toast.success('Option set updated');
      } else {
        const res = await apiServerClient.fetch('/admin/profile-option-sets', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            key: setForm.key,
            label: setForm.label,
            group_slug: setForm.group_slug,
            sort_order: Number(setForm.sort_order) || 0,
            active: setForm.active,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Create failed');
        }
        toast.success('Option set created');
      }
      setSetDialogOpen(false);
      await loadSets();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSetSaving(false);
    }
  };

  const deactivateSet = async (row) => {
    if (!window.confirm(`Deactivate "${row.label}"? Existing patient answers keep stored slugs.`)) return;
    try {
      const res = await apiServerClient.fetch(`/admin/profile-option-sets/${row.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Deactivate failed');
      }
      toast.success('Set deactivated');
      await loadSets();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const saveValue = async () => {
    if (!activeSet) return;
    setValSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      if (editingVal) {
        const res = await apiServerClient.fetch(`/admin/profile-option-values/${editingVal.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            label: valForm.label,
            sort_order: Number(valForm.sort_order) || 0,
            active: valForm.active,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Update failed');
        }
        toast.success('Option updated');
      } else {
        const res = await apiServerClient.fetch('/admin/profile-option-values', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            set_id: activeSet.id,
            slug: valForm.slug,
            label: valForm.label,
            sort_order: Number(valForm.sort_order) || 0,
            active: valForm.active,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Create failed');
        }
        toast.success('Option created');
      }
      setValDialogOpen(false);
      await loadValues(activeSet.id);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setValSaving(false);
    }
  };

  const deactivateValue = async (row) => {
    if (!window.confirm(`Deactivate "${row.label}"?`)) return;
    try {
      const res = await apiServerClient.fetch(`/admin/profile-option-values/${row.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Deactivate failed');
      }
      toast.success('Option deactivated');
      await loadValues(activeSet.id);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const setColumns = [
    { key: 'key', label: 'Key' },
    { key: 'label', label: 'Label' },
    {
      key: 'group_slug',
      label: 'Group',
      render: (r) => GROUP_LABELS[r.group_slug] || r.group_slug,
    },
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
        <TableRowActionsMenu
          items={[
            { label: 'Values', icon: ListTree, onClick: () => void openValues(row) },
            {
              label: 'Edit',
              icon: Pencil,
              onClick: () => {
                setEditingSet(row);
                setSetForm({
                  key: row.key,
                  label: row.label,
                  group_slug: row.group_slug || 'general',
                  sort_order: row.sort_order ?? 0,
                  active: row.active !== false,
                });
                setSetDialogOpen(true);
              },
              separatorBefore: true,
            },
            row.active
              ? {
                  label: 'Deactivate',
                  icon: Ban,
                  onClick: () => void deactivateSet(row),
                  className: 'text-warning',
                  separatorBefore: true,
                }
              : null,
          ].filter(Boolean)}
        />
      ),
    },
  ];

  const valColumns = [
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
        <TableRowActionsMenu
          items={[
            {
              label: 'Edit',
              icon: Pencil,
              onClick: () => {
                setEditingVal(row);
                setValForm({
                  slug: row.slug,
                  label: row.label,
                  sort_order: row.sort_order ?? 0,
                  active: row.active !== false,
                });
                setValDialogOpen(true);
              },
            },
            row.active
              ? {
                  label: 'Deactivate',
                  icon: Ban,
                  onClick: () => void deactivateValue(row),
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wide">Patient onboarding</span>
          </div>
          <h1 className="text-3xl font-bold font-display">Profile reference data</h1>
          <p className="text-muted-foreground">
            All dropdown and multi-select lists for the 14-step health profile. Visit types and booking insurance live
            under <span className="text-foreground">Appointment options</span>.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingSet(null);
            setSetForm({ key: '', label: '', group_slug: 'general', sort_order: 0, active: true });
            setSetDialogOpen(true);
          }}
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          New set
        </Button>
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-6 items-start',
          groupsCollapsed
            ? 'xl:grid-cols-[56px_minmax(0,1fr)]'
            : 'xl:grid-cols-[210px_minmax(0,1fr)]',
        )}
      >
        <Card className="border-none shadow-sm xl:sticky xl:top-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              {!groupsCollapsed ? <CardTitle className="text-base">Groups</CardTitle> : <div />}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setGroupsCollapsed((prev) => !prev)}
                title={groupsCollapsed ? 'Expand groups panel' : 'Collapse groups panel'}
              >
                {groupsCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </div>
            {!groupsCollapsed ? <CardDescription>Filter by section</CardDescription> : null}
          </CardHeader>
          <CardContent className={cn('p-0', groupsCollapsed ? 'px-2 pb-3' : '')}>
            {groupsCollapsed ? (
              <div className="flex justify-center pb-1">
                <Badge variant="secondary" className="text-xs">
                  {sets.length}
                </Badge>
              </div>
            ) : (
              <ScrollArea className="h-[min(70vh,520px)]">
                <nav className="flex flex-col gap-0.5 p-3 pr-4">
                <button
                  type="button"
                  onClick={() => setGroupFilter('all')}
                  className={cn(
                    'text-left rounded-lg px-3 py-2 text-sm transition-colors',
                    groupFilter === 'all' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted',
                  )}
                >
                  All groups
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {sets.length}
                  </Badge>
                </button>
                {GROUP_ORDER.filter((g) => groupCounts[g]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroupFilter(g)}
                    className={cn(
                      'text-left rounded-lg px-3 py-2 text-sm transition-colors',
                      groupFilter === g ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted',
                    )}
                  >
                    {GROUP_LABELS[g] || g}
                    <span className="text-muted-foreground ml-1">({groupCounts[g]})</span>
                  </button>
                ))}
                </nav>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm min-w-0">
          <CardHeader className="pb-2 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <CardTitle>Option sets</CardTitle>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search key, label…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <CardDescription>
              {filteredSets.length} set{filteredSets.length === 1 ? '' : 's'} shown — use Values to edit dropdown
              entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={setColumns} data={filteredSets} isLoading={loading} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={valuesOpen} onOpenChange={setValuesOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Options: {activeSet?.label}
              <Badge variant="outline" className="font-mono text-xs font-normal">
                {activeSet?.key}
              </Badge>
            </DialogTitle>
            <DialogDescription>Add, edit, or deactivate individual dropdown values.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pb-2">
            <Button
              size="sm"
              onClick={() => {
                setEditingVal(null);
                setValForm({ slug: '', label: '', sort_order: 0, active: true });
                setValDialogOpen(true);
              }}
              disabled={!activeSet}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Add value
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <DataTable columns={valColumns} data={values} isLoading={valuesLoading} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={setDialogOpen} onOpenChange={setSetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSet ? 'Edit option set' : 'New option set'}</DialogTitle>
            <DialogDescription>
              {editingSet ? 'Key is fixed. Adjust label, group, order, or deactivate.' : 'Key is permanent (lowercase, hyphen).'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Key</Label>
              <Input
                value={setForm.key}
                onChange={(e) => setSetForm({ ...setForm, key: e.target.value })}
                disabled={!!editingSet}
                placeholder="e.g. preferred_language"
                className="bg-background font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={setForm.label}
                onChange={(e) => setSetForm({ ...setForm, label: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Group</Label>
              <Select
                value={setForm.group_slug}
                onValueChange={(v) => setSetForm({ ...setForm, group_slug: v })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_ORDER.map((g) => (
                    <SelectItem key={g} value={g}>
                      {GROUP_LABELS[g] || g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={setForm.sort_order}
                onChange={(e) => setSetForm({ ...setForm, sort_order: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="set-active"
                checked={setForm.active}
                onChange={(e) => setSetForm({ ...setForm, active: e.target.checked })}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="set-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveSet()} disabled={setSaving}>
              {setSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingSet ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={valDialogOpen} onOpenChange={setValDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVal ? 'Edit option value' : 'New option value'}</DialogTitle>
            <DialogDescription>{editingVal ? 'Slug is fixed.' : 'Slug is permanent within this set.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={valForm.slug}
                onChange={(e) => setValForm({ ...valForm, slug: e.target.value })}
                disabled={!!editingVal}
                className="bg-background font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={valForm.label}
                onChange={(e) => setValForm({ ...valForm, label: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={valForm.sort_order}
                onChange={(e) => setValForm({ ...valForm, sort_order: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="val-active"
                checked={valForm.active}
                onChange={(e) => setValForm({ ...valForm, active: e.target.checked })}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="val-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveValue()} disabled={valSaving}>
              {valSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingVal ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
