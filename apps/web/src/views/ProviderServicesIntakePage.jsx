
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';
import { Loader2, ArrowLeft } from 'lucide-react';
import {
  createEmptyServiceRow,
  ServicesPricingFields,
} from '@/components/provider-onboarding/ServicesPricingFields.jsx';

export default function ProviderServicesIntakePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const applicationToken = searchParams.get('application_token')?.trim() || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [rows, setRows] = useState([createEmptyServiceRow(0)]);
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
        setRows([createEmptyServiceRow(0)]);
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
    setRows((prev) => [...prev, createEmptyServiceRow(prev.length)]);
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

            <ServicesPricingFields
              rows={rows}
              readOnly={readOnly}
              onUpdateRow={updateRow}
              onAddRow={addRow}
              onRemoveRow={removeRow}
            />

            {!readOnly ? (
              <div className="flex flex-wrap gap-3">
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
