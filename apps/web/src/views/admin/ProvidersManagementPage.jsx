
import React, { useState, useEffect, useCallback } from 'react';
import { adminPagedList } from '@/lib/adminSupabaseList.js';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
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
import { PROVIDER_PENDING_QUEUE_CHANGED_EVENT } from '@/lib/providerApplicationPendingQueue.js';

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

  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionBusy, setActionBusy] = useState(null);

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
    const { items } = await adminPagedList('providers', 1, 20, {
      searchColumn: searchTerm ? 'name' : undefined,
      searchTerm: searchTerm || undefined,
    });
    setData(items);
  }, [searchTerm]);

  const fetchApplications = useCallback(async () => {
    setAppsLoading(true);
    try {
      const res = await apiServerClient.fetch('/admin/provider-applications?status=submitted&limit=50');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load applications');
      }
      const json = await res.json();
      setApplications(json.items || []);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(PROVIDER_PENDING_QUEUE_CHANGED_EVENT));
      }
    } catch (e) {
      toast.error(e.message);
      setApplications([]);
    } finally {
      setAppsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await refreshProviders();
      } catch (error) {
        toast.error('Failed to fetch providers');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [searchTerm, refreshProviders]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    void loadProviderTypes();
  }, [loadProviderTypes]);

  const handleApprove = async (id) => {
    setActionBusy(id);
    try {
      const res = await apiServerClient.fetch(`/admin/provider-applications/${id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Approve failed');
      }
      const json = await res.json();
      toast.success('Application approved; provider record created', {
        description:
          json.email?.sent === false
            ? `Onboarding email could not be sent: ${json.email?.error || 'unknown error'}`
            : 'Onboarding confirmation email sent to the applicant.',
      });
      if (json.email?.sent === false) {
        toast.warning('Fix Resend configuration or check Resend logs — approval is already saved.');
      }
      await fetchApplications();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActionBusy(null);
    }
  };

  const openReject = (id) => {
    setRejectId(id);
    setRejectReason('');
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectId || !rejectReason.trim()) {
      toast.error('Enter a rejection reason');
      return;
    }
    setActionBusy(rejectId);
    try {
      const res = await apiServerClient.fetch(`/admin/provider-applications/${rejectId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Reject failed');
      }
      toast.success('Application rejected');
      setRejectOpen(false);
      setRejectId(null);
      await fetchApplications();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActionBusy(null);
    }
  };

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
    { key: 'name', label: 'Provider Name' },
    {
      key: 'type',
      label: 'Specialty',
      render: (r) => typeLabel(r.type),
    },
    { key: 'category', label: 'Category' },
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
        </div>
      ),
    },
  ];

  const appColumns = [
    { key: 'organization_name', label: 'Organization' },
    {
      key: 'type',
      label: 'Specialty',
      render: (r) => typeLabel(r.type),
    },
    { key: 'applicant_email', label: 'Applicant email' },
    {
      key: 'queue_status',
      label: 'Status',
      render: () => (
        <Badge variant="secondary" className="font-normal">
          Awaiting verification
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="default"
            disabled={actionBusy === row.id}
            onClick={() => void handleApprove(row.id)}
          >
            Approve
          </Button>
          <Button size="sm" variant="outline" disabled={actionBusy === row.id} onClick={() => openReject(row.id)}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Provider Management</h1>
        <p className="text-muted-foreground">Review submitted applications and manage marketplace providers.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Pending applications</h2>
            <Button variant="outline" size="sm" onClick={() => void fetchApplications()} disabled={appsLoading}>
              Refresh queue
            </Button>
          </div>
          <div className="p-4">
            <DataTable columns={appColumns} data={applications} isLoading={appsLoading} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border bg-muted/20">
            <SearchBar placeholder="Search providers..." onSearch={setSearchTerm} className="max-w-md" />
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

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>The applicant will receive this reason by email when Resend is configured.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Explain why this application is rejected..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmReject()} disabled={actionBusy === rejectId}>
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
