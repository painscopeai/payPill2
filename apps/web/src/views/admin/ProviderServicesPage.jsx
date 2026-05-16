
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { SearchBar } from '@/components/admin/SearchBar.jsx';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { TableRowActionsMenu } from '@/components/admin/TableRowActionsMenu.jsx';
import { deleteMenuItem } from '@/lib/adminDeleteMenu.js';
import { removeRowsFromState } from '@/lib/adminDataDelete.js';

const CATEGORY_LABEL = {
  service: 'Service',
  drug: 'Drug',
  other: 'Other',
};

const UNIT_LABEL = {
  per_visit: 'Per visit',
  per_dose: 'Per dose',
  flat: 'Flat fee',
  monthly: 'Monthly',
};

const FILTER_ALL = 'all';

export default function ProviderServicesPage() {
  const [searchParams] = useSearchParams();
  const providerIdFromUrl = searchParams.get('providerId')?.trim() || '';

  const authHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [providerOptions, setProviderOptions] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  const [filterProviderId, setFilterProviderId] = useState(
    providerIdFromUrl || FILTER_ALL,
  );
  const [filterCategory, setFilterCategory] = useState(FILTER_ALL);
  const [nameSearch, setNameSearch] = useState('');

  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    provider_id: '',
    name: '',
    category: 'service',
    unit: 'per_visit',
    price: '',
    currency: 'USD',
    notes: '',
    is_active: true,
    sort_order: 0,
  });

  const loadProviderOptions = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const res = await apiServerClient.fetch('/admin/bulk/provider-options', {
        headers: await authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load providers');
      setProviderOptions(data.items || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load providers');
      setProviderOptions([]);
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterProviderId && filterProviderId !== FILTER_ALL) {
        q.set('providerId', filterProviderId);
      }
      if (filterCategory && filterCategory !== FILTER_ALL) {
        q.set('category', filterCategory);
      }
      const qs = q.toString();
      const res = await apiServerClient.fetch(
        `/admin/provider-services${qs ? `?${qs}` : ''}`,
        { headers: await authHeaders() },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load catalog');
      setServices(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load catalog');
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, [filterProviderId, filterCategory]);

  useEffect(() => {
    void loadProviderOptions();
  }, [loadProviderOptions]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const filteredRows = useMemo(() => {
    const term = nameSearch.trim().toLowerCase();
    if (!term) return services;
    return services.filter((row) => {
      const hay = [
        row.name,
        row.provider_name,
        row.provider_type,
        CATEGORY_LABEL[row.category],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [services, nameSearch]);

  const providerLabel = useCallback(
    (id) => providerOptions.find((p) => p.id === id)?.name || '—',
    [providerOptions],
  );

  const openCreate = () => {
    const defaultProvider =
      filterProviderId && filterProviderId !== FILTER_ALL ? filterProviderId : '';
    if (!defaultProvider && providerOptions.length === 0) {
      toast.error('No providers available');
      return;
    }
    setEditing(null);
    setForm({
      provider_id: defaultProvider,
      name: '',
      category: filterCategory !== FILTER_ALL ? filterCategory : 'service',
      unit: 'per_visit',
      price: '',
      currency: 'USD',
      notes: '',
      is_active: true,
      sort_order: 0,
    });
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      provider_id: row.provider_id || '',
      name: row.name || '',
      category: row.category || 'service',
      unit: row.unit || 'per_visit',
      price: row.price != null ? String(row.price) : '',
      currency: row.currency || 'USD',
      notes: row.notes || '',
      is_active: row.is_active !== false,
      sort_order: row.sort_order ?? 0,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const price = Number.parseFloat(String(form.price));
    if (!form.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Valid price is required');
      return;
    }

    setSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
      if (editing) {
        const res = await apiServerClient.fetch(`/admin/provider-services/${editing.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            name: form.name.trim(),
            category: form.category,
            unit: form.unit,
            price,
            currency: form.currency.trim() || 'USD',
            notes: form.notes?.trim() || null,
            is_active: form.is_active,
            sort_order: Number(form.sort_order) || 0,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Update failed');
        toast.success('Catalog row updated');
      } else {
        if (!form.provider_id) {
          toast.error('Select a provider');
          return;
        }
        const res = await apiServerClient.fetch('/admin/provider-services', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            provider_id: form.provider_id,
            name: form.name.trim(),
            category: form.category,
            unit: form.unit,
            price,
            currency: form.currency.trim() || 'USD',
            notes: form.notes?.trim() || null,
            is_active: form.is_active,
            sort_order: Number(form.sort_order) || 0,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Create failed');
        toast.success('Catalog row added');
      }
      setDialogOpen(false);
      await loadServices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (row) => {
    const res = await apiServerClient.fetch(`/admin/provider-services/${row.id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Delete failed');
  };

  const remove = async (row) => {
    try {
      await deleteService(row);
      toast.success('Deleted');
      await loadServices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleDeleteRows = async (rows) => {
    try {
      for (const row of rows) {
        await deleteService(row);
      }
      toast.success(rows.length === 1 ? 'Service deleted' : `Deleted ${rows.length} services`);
      await loadServices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const activeFilterCount =
    (filterProviderId !== FILTER_ALL ? 1 : 0) + (filterCategory !== FILTER_ALL ? 1 : 0);

  const columns = [
    {
      key: 'provider_name',
      label: 'Provider',
      render: (r) => (
        <span className="font-medium">{r.provider_name || providerLabel(r.provider_id)}</span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (r) => r.name,
    },
    {
      key: 'category',
      label: 'Type',
      render: (r) => (
        <Badge variant="outline" className="bg-muted/40">
          {CATEGORY_LABEL[r.category] || r.category}
        </Badge>
      ),
    },
    {
      key: 'unit',
      label: 'Unit',
      render: (r) => UNIT_LABEL[r.unit] || r.unit,
    },
    {
      key: 'price',
      label: 'Price',
      render: (r) => `${r.currency || 'USD'} ${Number(r.price).toFixed(2)}`,
    },
    {
      key: 'is_active',
      label: 'Active',
      render: (r) => (r.is_active ? 'Yes' : 'No'),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <TableRowActionsMenu
          items={[
            { label: 'Edit', icon: Pencil, onClick: () => openEdit(r) },
            deleteMenuItem({
              displayName: r.name,
              onDelete: async () => {
                try {
                  await handleDeleteRows([r]);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Delete failed');
                }
              },
            }),
          ]}
        />
      ),
    },
  ];

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Service catalog</h1>
        <Button variant="link" className="h-auto px-0 pt-2" asChild>
          <Link to="/admin/providers">Back to providers</Link>
        </Button>
      </div>

      <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-4">
          <CardTitle className="text-lg">All services &amp; drugs</CardTitle>
          <Button type="button" onClick={openCreate} disabled={providersLoading}>
            <Plus className="mr-2 h-4 w-4" /> Add row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="space-y-2 min-w-[200px] flex-1 max-w-xs">
              <Label>Provider</Label>
              <Select
                value={filterProviderId}
                onValueChange={setFilterProviderId}
                disabled={providersLoading}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>All providers</SelectItem>
                  {providerOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[160px]">
              <Label>Type</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>All types</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="drug">Drug</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px] max-w-md">
              <Label className="sr-only">Search</Label>
              <SearchBar placeholder="Search name or provider…" onSearch={setNameSearch} />
            </div>
            {activeFilterCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => {
                  setFilterProviderId(FILTER_ALL);
                  setFilterCategory(FILTER_ALL);
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground">
            {servicesLoading
              ? 'Loading…'
              : `${filteredRows.length} row${filteredRows.length === 1 ? '' : 's'}`}
            {nameSearch.trim() && filteredRows.length !== services.length
              ? ` (filtered from ${services.length})`
              : null}
          </p>

          <DataTable
            columns={columns}
            data={filteredRows}
            isLoading={servicesLoading}
            selectable
            onDeleteRows={handleDeleteRows}
            getRowDeleteLabel={(r) => r.name || 'service'}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit catalog row' : 'New catalog row'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Provider: ${editing.provider_name || providerLabel(editing.provider_id)}`
                : 'Add a billable service or drug for a practice.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!editing ? (
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={form.provider_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, provider_id: v }))}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="drug">Drug</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_visit">Per visit</SelectItem>
                    <SelectItem value="per_dose">Per dose</SelectItem>
                    <SelectItem value="flat">Flat fee</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase().slice(0, 8) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="svc-active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <Label htmlFor="svc-active">Active</Label>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


