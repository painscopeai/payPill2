
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';

function emptyRow(sortOrder) {
  return {
    clientKey: `${Date.now()}-${sortOrder}-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    category: 'service',
    unit: 'per_visit',
    price: '',
    currency: 'USD',
    notes: '',
  };
}

export default function ProviderServicesIntakePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const applicationToken = searchParams.get('application_token')?.trim() || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [rows, setRows] = useState([emptyRow(0)]);
  const [blockedFormId, setBlockedFormId] = useState(null);
  const [phase, setPhase] = useState('form'); // form | done | skipped

  const apiBase = useMemo(() => getApiBaseUrl().replace(/\/$/, ''), []);

  const load = useCallback(async () => {
    if (!applicationToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${apiBase}/provider-onboarding/services?application_token=${encodeURIComponent(applicationToken)}`,
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data?.error === 'complete_questionnaire_first') {
        setBlockedFormId(typeof data.formId === 'string' ? data.formId : null);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Failed to load (${res.status})`);
      }
      setReadOnly(Boolean(data.readOnly));
      setApplicationStatus(data.applicationStatus || '');
      setOrganizationName(data.organizationName || '');
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length > 0) {
        setRows(
          items.map((r, i) => ({
            clientKey: r.id || `srv-${i}`,
            name: r.name || '',
            category: r.category || 'service',
            unit: r.unit || 'per_visit',
            price: r.price != null ? String(r.price) : '',
            currency: r.currency || 'USD',
            notes: r.notes || '',
          })),
        );
      } else {
        setRows([emptyRow(0)]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [apiBase, applicationToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRow = (idx, patch) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow(prev.length)]);
  };

  const removeRow = (idx) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const buildPayloadItems = () => {
    return rows
      .map((r, i) => ({
        name: r.name.trim(),
        category: r.category,
        unit: r.unit,
        price: r.price === '' ? NaN : Number.parseFloat(String(r.price)),
        currency: r.currency.trim() || 'USD',
        notes: r.notes.trim() || null,
        sort_order: i,
      }))
      .filter((r) => r.name.length > 0);
  };

  const submit = async () => {
    if (!applicationToken || readOnly) return;
    const items = buildPayloadItems();
    for (const it of items) {
      if (!Number.isFinite(it.price) || it.price < 0) {
        toast.error('Enter a valid price for each service row.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/provider-onboarding/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_token: applicationToken,
          items,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Save failed (${res.status})`);
      }
      toast.success(items.length ? `Saved ${data.saved ?? items.length} item(s).` : 'Updated.');
      setPhase('done');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => {
    setPhase('skipped');
  };

  if (!applicationToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Missing invitation</CardTitle>
            <CardDescription>Open this page from your PayPill provider invitation email.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (blockedFormId) {
    const backHref = `/forms/${blockedFormId}?application_token=${encodeURIComponent(applicationToken)}`;
    return (
      <div className="min-h-screen bg-muted/30 px-4 py-12">
        <div className="mx-auto max-w-lg">
          <PayPillLogo className="mx-auto mb-6 h-8" />
          <Card>
            <CardHeader>
              <CardTitle>Complete the questionnaire first</CardTitle>
              <CardDescription>
                After you submit the application form, you&apos;ll be able to add your services and pricing here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to={backHref}>Go to questionnaire</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === 'done' || phase === 'skipped') {
    return (
      <div className="min-h-screen bg-muted/30 px-4 py-12">
        <div className="mx-auto max-w-lg">
          <PayPillLogo className="mx-auto mb-6 h-8" />
          <Card className="overflow-hidden border shadow-lg">
            <div className="h-2 w-full bg-primary" />
            <CardHeader>
              <CardTitle>{phase === 'done' ? 'Services saved' : 'Continuing without a list'}</CardTitle>
              <CardDescription>
                {phase === 'done'
                  ? 'Your services and pricing were saved with your application. Our team will review everything shortly.'
                  : 'You can return to this page anytime using the same link from your invitation email to add your menu before approval.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Bookmark this page if you need to finish later: services can be edited until your application is reviewed.
              </p>
              <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" /> Back to PayPill home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex justify-center sm:justify-start">
          <PayPillLogo className="h-8 max-h-9 w-auto" />
        </div>

        <Card className="overflow-hidden border shadow-lg">
          <div className="h-2 w-full bg-primary" />
          <CardHeader>
            <CardTitle className="text-2xl font-display">Services &amp; pricing</CardTitle>
            <CardDescription>
              {organizationName ? (
                <>Add each service or medication with its price for <strong>{organizationName}</strong>.</>
              ) : (
                <>Add each service or medication with its price. You can add as many rows as you need.</>
              )}
              {readOnly ? (
                <span className="mt-2 block font-medium text-amber-700 dark:text-amber-400">
                  This application has been reviewed — service list is read-only.
                </span>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {applicationStatus ? (
              <p className="text-xs text-muted-foreground">Status: {applicationStatus}</p>
            ) : null}

            <div className="space-y-4">
              {rows.map((row, idx) => (
                <div
                  key={row.clientKey}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4"
                >
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[200px] flex-1 space-y-2">
                      <Label>Service or drug name</Label>
                      <Input
                        value={row.name}
                        disabled={readOnly}
                        onChange={(e) => updateRow(idx, { name: e.target.value })}
                        placeholder="e.g. Office visit, Lab panel, Medication name"
                      />
                    </div>
                    <div className="w-full sm:w-40 space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={row.category}
                        disabled={readOnly}
                        onValueChange={(v) => updateRow(idx, { category: v })}
                      >
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
                    <div className="w-full sm:w-44 space-y-2">
                      <Label>Unit</Label>
                      <Select value={row.unit} disabled={readOnly} onValueChange={(v) => updateRow(idx, { unit: v })}>
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
                  <div className="flex flex-wrap gap-3">
                    <div className="min-w-[120px] flex-1 space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={readOnly}
                        value={row.price}
                        onChange={(e) => updateRow(idx, { price: e.target.value })}
                      />
                    </div>
                    <div className="w-28 space-y-2">
                      <Label>Currency</Label>
                      <Input
                        disabled={readOnly}
                        value={row.currency}
                        onChange={(e) => updateRow(idx, { currency: e.target.value.toUpperCase().slice(0, 8) })}
                      />
                    </div>
                    <div className="min-w-[200px] flex-[2] space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        disabled={readOnly}
                        rows={2}
                        value={row.notes}
                        onChange={(e) => updateRow(idx, { notes: e.target.value })}
                        placeholder="Optional details"
                      />
                    </div>
                  </div>
                  {!readOnly && rows.length > 1 ? (
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(idx)}>
                        <Trash2 className="mr-1 h-4 w-4" /> Remove row
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {!readOnly ? (
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={addRow}>
                  <Plus className="mr-2 h-4 w-4" /> Add row
                </Button>
                <Button type="button" onClick={submit} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    'Save & submit list'
                  )}
                </Button>
                <Button type="button" variant="ghost" onClick={skip} disabled={submitting}>
                  I&apos;ll do this later
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
