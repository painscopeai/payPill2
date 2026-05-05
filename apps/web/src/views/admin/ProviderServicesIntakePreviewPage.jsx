
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';
import {
  createEmptyServiceRow,
  ServicesPricingFields,
} from '@/components/provider-onboarding/ServicesPricingFields.jsx';

/** Admin-only: same layout applicants see after submitting the provider questionnaire (no save). */
export default function ProviderServicesIntakePreviewPage() {
  const [rows, setRows] = useState(() => [
    {
      clientKey: 'preview-sample',
      name: 'Office visit (example)',
      category: 'service',
      unit: 'per_visit',
      price: '150',
      currency: 'USD',
      notes: 'Applicants can add unlimited rows.',
    },
    createEmptyServiceRow(1),
  ]);

  const updateRow = (idx, patch) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyServiceRow(prev.length)]);
  };

  const removeRow = (idx) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Preview — Services &amp; pricing — Admin</title>
      </Helmet>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Applicant view (preview)</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            This matches the screen shown at <code className="text-xs">/provider-onboarding/services</code> after an
            invitee submits the questionnaire. Nothing here is saved — use it to review layout and instructions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to="/admin/forms">Back to Forms Builder</Link>
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/admin/provider-onboarding">Provider onboarding</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex justify-center sm:justify-start">
            <PayPillLogo className="h-8 max-h-9 w-auto" />
          </div>

          <Card className="overflow-hidden border shadow-lg">
            <div className="h-2 w-full bg-primary" />
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl font-display">Services &amp; pricing</CardTitle>
                <Badge variant="secondary">Preview</Badge>
              </div>
              <CardDescription>
                Add each service or medication with its price for <strong>Your organization name</strong> (shown from
                the application in production).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ServicesPricingFields
                rows={rows}
                readOnly={false}
                onUpdateRow={updateRow}
                onAddRow={addRow}
                onRemoveRow={removeRow}
              />

              <div className="flex flex-wrap gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => toast.message('Preview only — applicants use Save & submit list with a valid invite link.')}
                >
                  Save &amp; submit list (demo)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => toast.message('Preview only — skipping does not apply here.')}
                >
                  I&apos;ll do this later (demo)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
