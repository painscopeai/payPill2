import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';
import PatientHealthOverviewPreview from '@/components/PatientHealthOverviewPreview.jsx';

/**
 * Dashboard “Basic profile”: opens the same stored-data preview as before (updates whenever you refetch after saving onboarding).
 */
export default function PatientBasicProfileSection() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);

  const loadOverview = async () => {
    setLoading(true);
    setPayload(null);
    try {
      const res = await apiServerClient.fetch('/patient-health-overview?includeRaw=1');
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || 'Could not load health overview');
        return;
      }
      setPayload(json);
      setOpen(true);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-primary/15 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Basic profile</CardTitle>
          <CardDescription>
            Stored answers from onboarding and your health records. Open to see what is saved—including gaps—and refresh
            after you update your profile; data reloads each time you open this view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={loadOverview} disabled={loading} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            View profile &amp; records
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" /> Stored profile &amp; records
            </DialogTitle>
            <DialogDescription>
              Normalized view with readable labels. Sparse onboarding steps show “No answers yet.” Expand “Full JSON” for
              the exact API response (includes raw Supabase rows when loaded).
            </DialogDescription>
          </DialogHeader>
          {payload && (
            <ScrollArea className="h-[min(60vh,520px)] w-full rounded-md border bg-muted/20 p-4 pr-3">
              <PatientHealthOverviewPreview payload={payload} hideAccountCard />
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
