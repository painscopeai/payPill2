import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';
import HealthReportMarkdown from '@/components/HealthReportMarkdown.jsx';

/** Must cover server wait (default 120s) + network; Vercel maxDuration 300 for this route. */
const WEBHOOK_POST_TIMEOUT_MS = Math.min(
	300_000,
	Math.max(30_000, Number(process.env.NEXT_PUBLIC_CLINICAL_AI_WEBHOOK_TIMEOUT_MS) || 180_000),
);

/**
 * Sends clinical payload to n8n, waits for the workflow response, and shows a formatted health report.
 */
export default function ClinicalAiWorkflowButton() {
  const [pending, setPending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState('');

  const sendToAiWorkflow = async () => {
    setPending(true);
    setReportMarkdown('');
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

      if (data.accepted === true && data.async === true) {
        toast.success(typeof data.message === 'string' ? data.message : 'Queued.');
        return;
      }

      const md = data?.report?.markdown;
      if (typeof md === 'string' && md.trim()) {
        setReportMarkdown(md);
        setReportOpen(true);
        toast.success('Your health report is ready.');
        return;
      }

      toast.success('Workflow finished, but no report text was returned.');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Could not reach server');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
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
              <Loader2 className="h-5 w-5 animate-spin" /> Generating report…
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" /> Send health data to AI workflow
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center max-w-md">
          Sends your profile data to your n8n workflow, then shows a formatted health report here (this can take up to a
          few minutes while the AI runs).
        </p>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2 pr-12">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-primary" />
              Your health report
            </DialogTitle>
            <DialogDescription>
              Summary from your AI workflow. This is for education and planning—not a substitute for professional care.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[min(65vh,560px)] px-6 border-y bg-card/50">
            <div className="py-4 pr-3">
              <HealthReportMarkdown markdown={reportMarkdown} />
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setReportOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
