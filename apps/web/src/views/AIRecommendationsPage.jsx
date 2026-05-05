import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useRecommendations } from '@/contexts/RecommendationContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, CheckCircle2, Eye, Sparkles, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import ClinicalAiWorkflowButton from '@/components/ClinicalAiWorkflowButton.jsx';
import apiServerClient from '@/lib/apiServerClient';
import HealthReportMarkdown from '@/components/HealthReportMarkdown.jsx';

export default function AIRecommendationsPage() {
  const { recommendations, fetchRecommendations, acceptRecommendation, declineRecommendation } =
    useRecommendations();
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [viewReport, setViewReport] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await apiServerClient.fetch('/patient-ai-reports');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to load reports (${res.status})`);
      }
      setReports(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load report history');
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const deleteReport = useCallback(async (id) => {
    if (!id || deletingId) return;
    setDeletingId(id);
    try {
      const res = await apiServerClient.fetch(`/patient-ai-reports/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to delete report (${res.status})`);
      }
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (viewReport?.id === id) {
        setViewReport(null);
      }
      toast.success('Report deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }, [deletingId, viewReport?.id]);

  const reportRows = useMemo(
    () =>
      reports.map((r) => ({
        ...r,
        preview: (r.report_markdown || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      })),
    [reports],
  );

  const confidencePercent = (rec) => {
    const raw = rec.confidence_score ?? rec.confidence_level;
    if (raw == null || Number.isNaN(Number(raw))) return null;
    const n = Number(raw);
    return n <= 1 ? Math.round(n * 100) : Math.round(n);
  };

  const getPriorityColor = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high') return 'bg-destructive text-destructive-foreground';
    if (p === 'medium') return 'bg-accent text-accent-foreground';
    if (p === 'low') return 'bg-secondary text-secondary-foreground';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-8">
      <Helmet><title>Health Action Plan - PayPill</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Health Action Plan</h1>
          <p className="text-muted-foreground mt-2">Your personalized AI-generated health recommendations.</p>
        </div>
        <ClinicalAiWorkflowButton onReportSaved={fetchReports} />
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-primary/[0.07] to-transparent border-b border-border/70">
          <CardTitle className="text-lg">Saved AI Reports</CardTitle>
          <p className="text-sm text-muted-foreground">
            Every generated report is logged here. Open any report or delete records you no longer need.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {reportsLoading ? (
            <div className="p-8 text-sm text-muted-foreground">Loading report history…</div>
          ) : reportRows.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground">
              No saved reports yet. Click <strong>Send health data to AI workflow</strong> to generate one.
            </div>
          ) : (
            <div className="rounded-b-2xl bg-card/70">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="py-3 pl-5">Report</TableHead>
                    <TableHead className="py-3">Generated</TableHead>
                    <TableHead className="py-3">Source</TableHead>
                    <TableHead className="py-3 text-right pr-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportRows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-primary/[0.03]">
                      <TableCell className="pl-5 py-4">
                        <p className="font-medium text-foreground">{row.title || 'Health Action Report'}</p>
                        <p className="text-xs text-muted-foreground mt-1">{row.preview || 'No preview available'}</p>
                      </TableCell>
                      <TableCell className="py-4 text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="bg-muted/40">
                          {row.source || 'clinical_ai_webhook'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 pr-5">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => setViewReport(row)}
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => deleteReport(row.id)}
                            disabled={deletingId === row.id}
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            {deletingId === row.id ? 'Deleting…' : 'Delete'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {recommendations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">No recommendations yet</h3>
            <p className="text-muted-foreground max-w-md mt-2 mb-6">
              Saved recommendations appear here after you generate them. If you already created some, they load in the
              background when you open this page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec) => {
            const confPct = confidencePercent(rec);
            return (
            <Card key={rec.id} className="flex flex-col h-full interactive-card">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {rec.recommendation_type || 'General'}
                  </Badge>
                  <Badge className={getPriorityColor(rec.priority)}>
                    {rec.priority || 'Medium'} Priority
                  </Badge>
                </div>
                <CardTitle className="text-xl leading-snug line-clamp-2">{rec.title || rec.recommendation_title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{rec.description || rec.recommendation_description}</p>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 p-2 rounded-md w-fit">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Confidence:{' '}
                  <span className="text-foreground">
                    {confPct != null ? `${confPct}%` : '—'}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 mt-auto flex gap-2">
                {rec.status === 'Accepted' ? (
                  <Button variant="secondary" className="w-full bg-secondary/20 text-secondary hover:bg-secondary/30" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Accepted
                  </Button>
                ) : rec.status === 'Declined' ? (
                  <Button variant="outline" className="w-full text-destructive border-destructive/20" disabled>
                    <XCircle className="h-4 w-4 mr-2" /> Declined
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1 text-destructive hover:bg-destructive/10" onClick={() => declineRecommendation(rec.id, 'Not applicable')}>
                      Decline
                    </Button>
                    <Button className="flex-1" onClick={() => acceptRecommendation(rec.id)}>
                      Accept
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(viewReport)} onOpenChange={(open) => !open && setViewReport(null)}>
        <DialogContent className="max-w-4xl h-[min(90vh,900px)] max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 pt-6 pb-3">
            <DialogTitle>{viewReport?.title || 'Health Action Report'}</DialogTitle>
            <DialogDescription>
              Generated {viewReport?.created_at ? new Date(viewReport.created_at).toLocaleString() : '—'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto bg-muted/20 px-6 py-5">
            <HealthReportMarkdown markdown={viewReport?.report_markdown || ''} />
          </div>
          <DialogFooter className="border-t px-6 py-4">
            {viewReport?.id && (
              <Button
                variant="outline"
                className="mr-auto text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => deleteReport(viewReport.id)}
                disabled={deletingId === viewReport.id}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deletingId === viewReport.id ? 'Deleting…' : 'Delete report'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewReport(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}