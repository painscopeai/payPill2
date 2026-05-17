
import React, { useState, useEffect, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { TableRowActionsMenu } from '@/components/admin/TableRowActionsMenu.jsx';
import { deleteMenuItem } from '@/lib/adminDeleteMenu.js';
import { deleteAdminProvider, removeRowsFromState } from '@/lib/adminDataDelete.js';
import { ListChecks, Tags } from 'lucide-react';
import { useServerTablePagination } from '@/hooks/useServerTablePagination';

export default function ProvidersManagementPage() {
  const {
    page,
    setPage,
    pageSize,
    totalPages,
    setTotalPages,
    totalCount,
    setTotalCount,
    onPageSizeChange,
  } = useServerTablePagination();

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
    const { items, totalPages: tp, total } = await adminPagedList('providers', page, pageSize, {
      searchColumn: searchTerm ? 'name' : undefined,
      searchTerm: searchTerm || undefined,
    });
    setData(items);
    setTotalPages(tp);
    setTotalCount(total ?? 0);
  }, [searchTerm, page, pageSize]);

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
  }, [searchTerm, page, pageSize, refreshProviders]);

  useEffect(() => {
    void loadProviderTypes();
  }, [loadProviderTypes]);

  const removeProvider = async (row) => {
    try {
      await deleteAdminProvider(row.id);
      toast.success('Provider deleted');
      await refreshProviders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleDeleteRows = async (rows) => {
    try {
      for (const row of rows) {
        await deleteAdminProvider(row.id);
      }
      toast.success(rows.length === 1 ? 'Provider deleted' : `Deleted ${rows.length} providers`);
      await refreshProviders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
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
        <TableRowActionsMenu
          items={[
            {
              label: 'Assign specialty',
              icon: Tags,
              onClick: () => {
                setSpecialtyRow(row);
                setSpecialtySlug(row.type || '');
                setSpecialtyDialog(true);
              },
            },
            {
              label: 'Services',
              icon: ListChecks,
              href: `/admin/provider-services?providerId=${encodeURIComponent(row.id)}`,
              separatorBefore: true,
            },
            deleteMenuItem({
              displayName: row.name || row.email || 'provider',
              onDelete: async () => {
                try {
                  await handleDeleteRows([row]);
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
        <h1 className="text-3xl font-bold font-display">Providers</h1>
      </div>

      <Card className="w-full border-none shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border bg-muted/20">
            <SearchBar placeholder="Search practices..." onSearch={setSearchTerm} className="max-w-md" />
          </div>
          <div className="p-4">
            <DataTable
              columns={columns}
              data={data}
              isLoading={isLoading}
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={onPageSizeChange}
              selectable
              onDeleteRows={handleDeleteRows}
              getRowDeleteLabel={(r) => r.name || r.email || 'provider'}
            />
          </div>
        </CardContent>
      </Card>

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

