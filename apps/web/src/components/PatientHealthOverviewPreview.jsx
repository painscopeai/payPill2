import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function FieldGrid({ fields }) {
  const entries = Object.entries(fields || {});
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No fields saved for this section.</p>;
  }
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-muted-foreground font-medium break-words">{k}</dt>
          <dd className="mt-0.5 break-words">{formatValue(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Normalizes GET /api/patient-health-overview: flat body (schemaVersion, counts, sections…)
 * or legacy { meta, overview, raw? }.
 */
function getOverviewFromPayload(payload) {
  if (!payload) return null;
  if (payload.overview) {
    const { meta, overview, raw } = payload;
    return {
      schemaVersion: meta?.schemaVersion,
      userId: meta?.userId,
      fetchedAt: meta?.fetchedAt,
      counts: meta?.counts,
      account: overview.account,
      demographics: overview.demographics,
      bodyMetrics: overview.bodyMetrics,
      conditions: overview.conditions,
      onboardingSteps: overview.onboardingSteps,
      healthRecords: overview.healthRecords,
      raw,
    };
  }
  return {
    schemaVersion: payload.schemaVersion,
    userId: payload.userId,
    fetchedAt: payload.fetchedAt,
    counts: payload.counts,
    account: payload.account,
    demographics: payload.demographics,
    bodyMetrics: payload.bodyMetrics,
    conditions: payload.conditions,
    onboardingSteps: payload.onboardingSteps,
    healthRecords: payload.healthRecords,
    raw: payload.raw,
  };
}

export default function PatientHealthOverviewPreview({ payload }) {
  const [rawOpen, setRawOpen] = useState(false);
  const data = getOverviewFromPayload(payload);
  if (!data) return null;
  const looksValid =
    payload?.overview != null ||
    (typeof payload?.schemaVersion === 'number' && payload?.counts != null);
  if (!looksValid) {
    return (
      <p className="text-sm text-muted-foreground">
        Unrecognized response shape. Expected a structured patient health overview.
      </p>
    );
  }

  const { account, demographics, bodyMetrics, conditions, onboardingSteps, healthRecords, raw } = data;
  const meta = { schemaVersion: data.schemaVersion, fetchedAt: data.fetchedAt, counts: data.counts };

  const subscriptionDisplay =
    [account?.subscriptionPlan, account?.subscriptionStatus].filter(Boolean).join(' · ') || '—';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Schema v{meta.schemaVersion ?? '—'} · Fetched{' '}
        {meta.fetchedAt ? new Date(meta.fetchedAt).toLocaleString() : '—'}
        <br />
        {meta.counts?.hasProfile ? 'Profile: yes' : 'Profile: no'} · Onboarding rows:{' '}
        {meta.counts?.onboardingStepRows ?? '—'} · Health records: {meta.counts?.healthRecords ?? '—'}
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Identity and account settings from your profile.</CardDescription>
        </CardHeader>
        <CardContent>
          {!account ? (
            <p className="text-sm text-muted-foreground">No profile row found for this user.</p>
          ) : (
            <FieldGrid
              fields={{
                Name: account.displayName,
                Email: account.email,
                Phone: account.phone,
                Role: account.role,
                'Date of birth': account.dateOfBirth,
                'Onboarding complete': account.onboardingCompleted,
                'Onboarding completed at': account.onboardingCompletedAt,
                'Terms accepted': account.termsAccepted,
                'Privacy preferences': account.privacyPreferencesAccepted,
                Subscription: subscriptionDisplay,
                'Account status': account.accountStatus,
                Created: account.createdAt,
                Updated: account.updatedAt,
              }}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Basic health information</CardTitle>
          <CardDescription>Onboarding step 2 (and profile date of birth when it differs or is the only source).</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGrid fields={demographics} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Body measurements & vitals</CardTitle>
          <CardDescription>Onboarding step 3.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGrid fields={bodyMetrics} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pre-existing conditions</CardTitle>
          <CardDescription>From onboarding step 4, grouped by category.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.keys(conditions?.byCategory || {}).length === 0 ? (
            <p className="text-sm text-muted-foreground">No conditions recorded.</p>
          ) : (
            Object.entries(conditions.byCategory).map(([cat, list]) => (
              <div key={cat}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{cat}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {(list || []).map((label) => (
                    <li key={label}>
                      <Badge variant="secondary">{label}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Onboarding steps</CardTitle>
          <CardDescription>Each saved step, with human-readable field labels.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {(onboardingSteps || []).map((step) => (
              <AccordionItem key={step.stepNumber} value={`step-${step.stepNumber}`}>
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {step.stepNumber}. {step.stepTitle}
                    </span>
                    {step.isSparse && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        No answers yet
                      </Badge>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    Last saved: {step.lastSavedAt ? new Date(step.lastSavedAt).toLocaleString() : '—'}
                  </p>
                  <FieldGrid fields={step.fields} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Health records</CardTitle>
          <CardDescription>Entries in patient_health_records (most recent first).</CardDescription>
        </CardHeader>
        <CardContent>
          {!healthRecords?.length ? (
            <p className="text-sm text-muted-foreground">No health records on file.</p>
          ) : (
            <div className="space-y-3">
              {healthRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{rec.title || 'Untitled'}</span>
                    <Badge variant="outline">{rec.recordType}</Badge>
                  </div>
                  <FieldGrid
                    fields={{
                      Date: rec.recordDate,
                      Status: rec.status,
                      'Provider / facility': rec.providerOrFacility,
                      Notes: rec.notes,
                      'Created': rec.createdAt,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Collapsible open={rawOpen} onOpenChange={setRawOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between gap-2 px-2">
            <span className="text-muted-foreground">Full JSON (copy / debug)</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${rawOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 text-xs font-mono whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-3 max-h-[280px] overflow-auto">
            {JSON.stringify(payload, null, 2)}
          </pre>
          {raw && (
            <p className="text-xs text-muted-foreground mt-2">
              Includes raw Supabase rows under <code className="text-[11px]">raw</code>.
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
