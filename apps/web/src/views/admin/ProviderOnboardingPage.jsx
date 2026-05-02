
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from 'sonner';
import { Loader2, MailPlus, Pencil } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { StatusBadge } from '@/components/admin/StatusBadge.jsx';
import { labelForOnboardingFormType } from '@/lib/providerOnboardingInviteFormTypes';

/** Used only if provider_types API returns nothing (e.g. migration not applied). */
const FALLBACK_TYPE_OPTIONS = [
  { slug: 'hospital', label: 'Hospital' },
  { slug: 'pharmacy', label: 'Pharmacy' },
  { slug: 'clinic', label: 'Clinic' },
  { slug: 'specialist', label: 'Specialist' },
  { slug: 'other', label: 'Other' },
];

function categoryLabelForType(typeOptions, slug) {
  const o = typeOptions.find((x) => x.slug === slug);
  return o ? o.label : slug || '';
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function ProviderOnboardingPage() {
  const [typeOptions, setTypeOptions] = useState(FALLBACK_TYPE_OPTIONS);
  const [typesLoading, setTypesLoading] = useState(true);

  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [templateForms, setTemplateForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    organization_name: '',
    type: '',
    applicant_email: '',
    phone: '',
    specialty: '',
    form_id: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  /** After saving a draft, POST /invite so Resend emails the form link. */
  const [sendInviteAfterSave, setSendInviteAfterSave] = useState(true);

  const authHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadProviderTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const res = await apiServerClient.fetch('/admin/provider-types', {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load provider types');
      }
      const data = await res.json();
      const rows = data.items || [];
      if (rows.length > 0) {
        setTypeOptions(rows.map((r) => ({ slug: r.slug, label: r.label })));
      } else {
        setTypeOptions(FALLBACK_TYPE_OPTIONS);
      }
    } catch (e) {
      toast.error(e.message);
      setTypeOptions(FALLBACK_TYPE_OPTIONS);
    } finally {
      setTypesLoading(false);
    }
  }, []);

  const loadFormTemplates = useCallback(async () => {
    setFormsLoading(true);
    try {
      const res = await apiServerClient.fetch('/admin/provider-application-forms', {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load forms');
      }
      const data = await res.json();
      setTemplateForms(data.items || []);
    } catch (e) {
      toast.error(e.message);
      setTemplateForms([]);
    } finally {
      setFormsLoading(false);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    setAppsLoading(true);
    try {
      const res = await apiServerClient.fetch(
        `/admin/provider-applications?status=all&limit=50&page=${page}`,
        {
          headers: await authHeaders(),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load applications');
      }
      const data = await res.json();
      const items = data.items || [];
      setApplications(items);
      const perPage = data.perPage || 50;
      const total = data.total ?? items.length;
      setTotalPages(Math.max(1, Math.ceil(total / perPage)));
    } catch (e) {
      toast.error(e.message);
      setApplications([]);
    } finally {
      setAppsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadProviderTypes();
  }, [loadProviderTypes]);

  useEffect(() => {
    loadFormTemplates();
  }, [loadFormTemplates]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const formNameById = useMemo(() => {
    const m = new Map();
    for (const f of templateForms) {
      if (f.id) m.set(f.id, f.name || f.id);
    }
    return m;
  }, [templateForms]);

  const selectedRow = useMemo(
    () => applications.find((a) => a.id === selectedId) || null,
    [applications, selectedId],
  );

  const openCreateDialog = () => {
    setEditingId(null);
    setSendInviteAfterSave(true);
    setFormData({
      organization_name: '',
      type: '',
      applicant_email: '',
      phone: '',
      specialty: '',
      form_id: '',
    });
    setDialogOpen(true);
  };

  const openEditDraft = () => {
    if (!selectedRow || selectedRow.status !== 'draft') {
      toast.error('Select a draft application to edit');
      return;
    }
    setEditingId(selectedRow.id);
    setSendInviteAfterSave(false);
    setFormData({
      organization_name: selectedRow.organization_name || '',
      type: selectedRow.type || '',
      applicant_email: selectedRow.applicant_email || '',
      phone: selectedRow.phone || '',
      specialty: selectedRow.specialty || '',
      form_id: selectedRow.form_id || '',
    });
    setDialogOpen(true);
  };

  const saveDraft = async (e) => {
    e.preventDefault();
    if (!formData.applicant_email?.trim()) {
      toast.error('Applicant email is required');
      return;
    }
    if (!formData.type?.trim() || formData.type === 'unspecified') {
      toast.error('Select a provider type');
      return;
    }
    if (!formData.form_id) {
      toast.error('Select an applicant form');
      return;
    }

    setIsSaving(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      };
      const category = formData.type ? categoryLabelForType(typeOptions, formData.type) : null;
      const body = {
        applicant_email: formData.applicant_email.trim(),
        organization_name: formData.organization_name?.trim() || null,
        type: formData.type || 'unspecified',
        category,
        phone: formData.phone?.trim() || null,
        specialty: formData.specialty?.trim() || null,
        form_id: formData.form_id,
      };

      let res;
      if (editingId) {
        res = await apiServerClient.fetch(`/admin/provider-applications/${editingId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(body),
        });
      } else {
        res = await apiServerClient.fetch('/admin/provider-applications', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Save failed');
      }
      const json = await res.json();
      const app = json.application;
      setSelectedId(app.id);

      if (sendInviteAfterSave) {
        setInviteBusy(true);
        try {
          const invRes = await apiServerClient.fetch(`/admin/provider-applications/${app.id}/invite`, {
            method: 'POST',
            headers: await authHeaders(),
          });
          if (!invRes.ok) {
            const err = await invRes.json().catch(() => ({}));
            throw new Error(err.error || 'Invitation email failed');
          }
          toast.success('Draft saved — invitation email sent with form link');
        } catch (invErr) {
          toast.error(invErr.message);
          toast.info('Draft saved. You can send the invitation from the table below.');
        } finally {
          setInviteBusy(false);
        }
      } else {
        toast.success('Draft saved');
      }

      setDialogOpen(false);
      await loadApplications();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const sendInvitation = async () => {
    if (!selectedRow) {
      toast.error('Select an application');
      return;
    }
    if (selectedRow.status !== 'draft' && selectedRow.status !== 'invited') {
      toast.error('Only draft or invited applications can receive an invitation email');
      return;
    }
    setInviteBusy(true);
    try {
      const res = await apiServerClient.fetch(`/admin/provider-applications/${selectedRow.id}/invite`, {
        method: 'POST',
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Invitation failed');
      }
      toast.success(
        selectedRow.status === 'invited'
          ? 'Invitation resent successfully'
          : 'Invitation sent — applicant will receive an email',
      );
      await loadApplications();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setInviteBusy(false);
    }
  };

  const canInvite =
    selectedRow &&
    (selectedRow.status === 'draft' || selectedRow.status === 'invited') &&
    selectedRow.form_id &&
    !selectedRow.form_response_id;

  const columns = [
    {
      key: 'organization_name',
      label: 'Organization',
      render: (r) => <span className="font-medium">{r.organization_name || '—'}</span>,
    },
    {
      key: 'type',
      label: 'Type',
      render: (r) => categoryLabelForType(typeOptions, r.type) || r.type || '—',
    },
    { key: 'applicant_email', label: 'Applicant email' },
    {
      key: 'form',
      label: 'Applicant form',
      render: (r) => (r.form_id ? formNameById.get(r.form_id) || r.form_id : '—'),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'updated_at',
      label: 'Updated',
      render: (r) => <span className="text-muted-foreground tabular-nums">{formatWhen(r.updated_at)}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Provider Onboarding</h1>
          <p className="mt-1 text-muted-foreground">
            Create drafts, send the Form Builder questionnaire by email, then review submissions in{' '}
            <Link to="/admin/providers" className="text-primary underline-offset-4 hover:underline">
              Provider Management
            </Link>
            .{' '}
            <Link to="/admin/provider-types" className="text-primary underline-offset-4 hover:underline">
              Manage provider types
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={openCreateDialog} className="gap-2">
            <MailPlus className="h-4 w-4" />
            Onboarding applicant
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedRow || selectedRow.status !== 'draft'}
            onClick={openEditDraft}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Edit draft
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Applications</CardTitle>
          <CardDescription>
            Draft and invited rows are your pipeline; submitted rows appear in Provider Management for approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTable
            columns={columns}
            data={applications}
            isLoading={appsLoading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            selectedRowId={selectedId}
            onRowClick={(row) => setSelectedId(row.id)}
          />

          {selectedRow ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Selected:</span>{' '}
                <span className="font-medium">{selectedRow.organization_name || selectedRow.id}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <StatusBadge status={selectedRow.status} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canInvite || inviteBusy}
                  onClick={() => void sendInvitation()}
                >
                  {inviteBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedRow.status === 'invited' ? (
                    'Resend invitation'
                  ) : (
                    'Send invitation'
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit draft application' : 'New applicant'}</DialogTitle>
            <DialogDescription>
              Choose a published applicant form and email. You can send the invitation immediately (email includes the
              form link), or save only and use Send invitation on the table.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveDraft} className="space-y-4">
            <div className="space-y-2">
              <Label>Organization / provider name</Label>
              <Input
                required
                value={formData.organization_name}
                onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Provider type</Label>
              <Select
                value={formData.type || undefined}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
                disabled={typesLoading}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={typesLoading ? 'Loading types…' : 'Select type'} />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((o) => (
                    <SelectItem key={o.slug} value={o.slug}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-applicant-email">Applicant email</Label>
              <Input
                id="onboarding-applicant-email"
                type="email"
                required
                autoComplete="email"
                placeholder="applicant@organization.com"
                value={formData.applicant_email}
                onChange={(e) => setFormData({ ...formData, applicant_email: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Applicant form</Label>
              <Select
                value={formData.form_id || undefined}
                onValueChange={(v) => setFormData({ ...formData, form_id: v })}
                disabled={formsLoading}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={formsLoading ? 'Loading forms…' : 'Select published template'} />
                </SelectTrigger>
                <SelectContent>
                  {templateForms.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      No matching published forms (provider application or health assessment). Publish a form in Forms
                      Builder — any supported type appears here automatically.
                    </div>
                  ) : (
                    templateForms.map((f) => {
                      const typeHint = f.form_type ? labelForOnboardingFormType(f.form_type) : '';
                      const primary = f.name || f.id;
                      const label = typeHint ? `${primary} · ${typeHint}` : primary;
                      return (
                        <SelectItem key={f.id} value={f.id}>
                          {label}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Specialty (optional)</Label>
              <Input
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <Checkbox
                id="send-invite-after-save"
                checked={sendInviteAfterSave}
                onCheckedChange={(v) => setSendInviteAfterSave(v === true)}
                disabled={isSaving || inviteBusy}
              />
              <div className="grid gap-1 leading-none">
                <label
                  htmlFor="send-invite-after-save"
                  className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Send invitation email now
                </label>
                <p className="text-xs text-muted-foreground">
                  Uses Resend to email the applicant a secure link to the selected form (configure{' '}
                  <code className="rounded bg-muted px-1">RESEND_API_KEY</code> and from-address env vars).
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || inviteBusy}
                className="bg-primary text-primary-foreground"
              >
                {isSaving || inviteBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : sendInviteAfterSave ? (
                  'Save & send invitation'
                ) : (
                  'Save as draft'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
