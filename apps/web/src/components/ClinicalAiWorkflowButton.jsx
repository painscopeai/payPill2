import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';

/** Fast route: server returns 202 immediately; n8n runs in `after()`. */
const WEBHOOK_POST_TIMEOUT_MS = Math.min(
	45_000,
	Math.max(8_000, Number(process.env.NEXT_PUBLIC_CLINICAL_AI_WEBHOOK_TIMEOUT_MS) || 25_000),
);

/**
 * Sends the same structured clinical data as Basic profile → View profile & records (minus account)
 * to your published n8n webhook in one JSON body — without blocking on the workflow response.
 */
export default function ClinicalAiWorkflowButton() {
  const [pending, setPending] = useState(false);

  const sendToAiWorkflow = async () => {
    setPending(true);
    try {
      const res = await apiServerClient.fetch('/clinical-ai-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        timeoutMs: WEBHOOK_POST_TIMEOUT_MS,
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        const msg =
          (typeof data?.message === 'string' && data.message) ||
          (typeof data?.error === 'string' && data.error) ||
          `Request failed (${res.status})`;
        toast.error(msg);
        return;
      }
      toast.success(
        typeof data?.message === 'string'
          ? data.message
          : 'Health data sent. Your workflow should receive it shortly.',
      );
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Could not reach server');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto text-lg h-14 px-8 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all gap-2"
        onClick={sendToAiWorkflow}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Zap className="h-5 w-5" /> Send health data to AI workflow
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center max-w-md">
        Uses your saved onboarding answers and records (same source as Basic profile). Nothing waits on the AI—your
        webhook receives one JSON payload right away.
      </p>
    </div>
  );
}
