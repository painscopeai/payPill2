
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminPagedList } from '@/lib/adminSupabaseList.js';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { SearchBar } from '@/components/admin/SearchBar.jsx';
import { StatusBadge } from '@/components/admin/StatusBadge.jsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function ProvidersManagementPage() {
  const authHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [schedDialog, setSchedDialog] = useState(false);
  const [schedRow, setSchedRow] = useState(null);
  const [schedUrl, setSchedUrl] = useState('');
  const [schedSaving, setSchedSaving] = useState(false);

  const [typeOptions, setTypeOptions] = useState([]);
  const [specialtyDialog, setSpecialtyDialog] = useState(false);
  const [specialtyRow, setSpecialtyRow] = useState(null);
  const [specialtySlug, setSpecialtySlug] = useState('');
  const [specialtySaving, setSpecialtySaving] = useState(false);

  const typeLabel = useCallback(
    (slug) => {
      if (!slug) return '—';
      const found = typeOptions.find((t) => t.slug === slug);
      return found?.label || slug;
    },
    [typeOptions],
  );

  const loadProviderTypes = useCallback(async () => {
    try {
      const res = await apiServerClient.fetch('/admin/provider-types', {
        headers: await authHeaders(),
      });
      if (!res.ok) return;
      const json = await res.json();
      setTypeOptions(json.items || []);
    } catch {
      setTypeOptions([]);
    }
  }, []);

  const refreshProviders = useCallback(async () => {
    const { items } = await adminPagedList('providers', 1, 50, {
      searchColumn: searchTerm ? 'name' : undefined,
      searchTerm: searchTerm || undefined,
    });
    setData(items);
  }, [searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await refreshProviders();
      } catch {
        toast.error('Failed to fetch providers');
      } finally {
        setIsLoading(false);
      }
    };
    void fetchData();
  }, [searchTerm, refreshProviders]);

  useEffect(() => {
    void loadProviderTypes();
  }, [loadProviderTypes]);

  const saveSchedulingUrl = async () => {
    if (!schedRow?.id) return;
    setSchedSaving(true);
    try {
      const trimmed = schedUrl.trim();
      const res = await apiServerClient.fetch(`/admin/providers/${schedRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          scheduling_url: trimmed === '' ? null : trimmed,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Update failed');
      }
      toast.success('Scheduling link saved');
      setSchedDialog(false);
      setSchedRow(null);
      await refreshProviders();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSchedSaving(false);
    }
  };

  const saveSpecialty = async () => {
    if (!specialtyRow?.id || !specialtySlug) {
      toast.error('Select a specialty');
      return;
    }
    setSpecialtySaving(true);
    try {
      const res = await apiServerClient.fetch(`/admin/providers/${specialtyRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ type: specialtySlug }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Update failed');
      }
      toast.success('Practice specialty updated');
      setSpecialtyDialog(false);
      setSpecialtyRow(null);
      await refreshProviders();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSpecialtySaving(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Practice name' },
    {
      key: 'type',
      label: 'Specialty',
      render: (r) => typeLabel(r.type),
    },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'verification_status', label: 'Verification', render: (r) => <StatusBadge status={r.verification_status} /> },
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
              setSpecialtyRow(row);
              setSpecialtySlug(row.type || '');
              setSpecialtyDialog(true);
            }}
          >
            Assign specialty
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setSchedRow(row);
              setSchedUrl(row.scheduling_url || '');
              setSchedDialog(true);
            }}
          >
            Scheduling link
          </Button>
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link to={`/admin/provider-services?providerId=${encodeURIComponent(row.id)}`}>Services</Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Provider directory</h1>
          <p className="text-muted-foreground max-w-2xl">
            Practices created via self-serve signup and onboarding. Assign a specialty to control operations (e.g.
            pharmacy inventory and patient shop). Manage service pricing from the service catalog.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/provider-types">Manage specialties</Link>
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border bg-muted/20">
            <SearchBar placeholder="Search practices..." onSearch={setSearchTerm} className="max-w-md" />
          </div>
          <div className="p-4">
            <DataTable columns={columns} data={data} isLoading={isLoading} />
          </div>
        </CardContent>
      </Card>

      <Dialog open={schedDialog} onOpenChange={setSchedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provider scheduling link</DialogTitle>
            <DialogDescription>
              Cal.com or other booking URL shown to patients and in confirmation emails. Use https://
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="sched-url">Scheduling URL</Label>
            <Input
              id="sched-url"
              value={schedUrl}
              onChange={(e) => setSchedUrl(e.target.value)}
              placeholder="https://cal.com/your-org/visit"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveSchedulingUrl()} disabled={schedSaving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={specialtyDialog} onOpenChange={setSpecialtyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign practice specialty</DialogTitle>
            <DialogDescription>
              Sets the organization type and operations profile (e.g. Pharmacy enables inventory and patient shop).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Specialty</Label>
            <Select value={specialtySlug || undefined} onValueChange={setSpecialtySlug}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions
                  .filter((t) => t.active !== false)
                  .map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSpecialtyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveSpecialty()} disabled={specialtySaving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
