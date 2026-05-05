
import React, { useState, useEffect, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';
import { adminPagedList } from '@/lib/adminSupabaseList.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function ProviderServicesPage() {
  const authHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [providerSearch, setProviderSearch] = useState('');
  const [providerRows, setProviderRows] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'service',
    unit: 'per_visit',
    price: '',
    currency: 'USD',
    notes: '',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setProvidersLoading(true);
      try {
        const { items } = await adminPagedList('providers', 1, 25, {
          searchColumn: providerSearch ? 'name' : undefined,
          searchTerm: providerSearch || undefined,
        });
        if (!cancelled) setProviderRows(items || []);
      } catch {
        if (!cancelled) toast.error('Failed to load providers');
      } finally {
        if (!cancelled) setProvidersLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [providerSearch]);

  const loadServices = useCallback(async () => {
    if (!selectedProvider?.id) {
      setServices([]);
      return;
    }
    setServicesLoading(true);
    try {
      const res = await apiServerClient.fetch(
        `/admin/provider-services?providerId=${encodeURIComponent(selectedProvider.id)}`,
        { headers: await authHeaders() },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load services');
      setServices(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load services');
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, [selectedProvider]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const openCreate = () => {
    if (!selectedProvider) {
      toast.error('Select a provider first');
      return;
    }
    setEditing(null);
    setForm({
      name: '',
      category: 'service',
      unit: 'per_visit',
      price: '',
      currency: 'USD',
      notes: '',
      is_active: true,
      sort_order: services.length,
    });
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
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
    if (!selectedProvider) return;
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
        toast.success('Service updated');
      } else {
        const res = await apiServerClient.fetch('/admin/provider-services', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            provider_id: selectedProvider.id,
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
        toast.success('Service added');
      }
      setDialogOpen(false);
      await loadServices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    try {
      const res = await apiServerClient.fetch(`/admin/provider-services/${row.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      toast.success('Deleted');
      await loadServices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: 'category',
      label: 'Category',
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
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(r)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => remove(r)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Provider service list</h1>
        <p className="mt-1 text-muted-foreground">
          Manage services and drug pricing per provider. Rows created during onboarding appear here after approval.
        </p>
      </div>

      <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] shadow-sm">
        <CardHeader>
          <CardTitle>Select provider</CardTitle>
          <CardDescription>Search by organization or provider name, then pick a row.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchBar placeholder="Search providers…" onSearch={setProviderSearch} />
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'type', label: 'Type' },
            ]}
            data={providerRows}
            isLoading={providersLoading}
            selectedRowId={selectedProvider?.id}
            onRowClick={(row) => setSelectedProvider(row)}
          />
          {selectedProvider ? (
            <p className="text-sm text-muted-foreground">
              Selected: <strong>{selectedProvider.name}</strong>
              <Button type="button" variant="link" className="ml-2 h-auto p-0" onClick={() => setSelectedProvider(null)}>
                Clear
              </Button>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-card))] shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Services &amp; pricing</CardTitle>
            <CardDescription>
              {selectedProvider
                ? `Editing catalog for ${selectedProvider.name}`
                : 'Select a provider above to view or edit rows.'}
            </CardDescription>
          </div>
          <Button type="button" onClick={openCreate} disabled={!selectedProvider}>
            <Plus className="mr-2 h-4 w-4" /> Add service
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={services} isLoading={servicesLoading} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit service' : 'New service'}</DialogTitle>
            <DialogDescription>
              Standard fields: name, category, unit, price, currency, notes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
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
