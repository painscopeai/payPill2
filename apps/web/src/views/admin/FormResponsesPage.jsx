
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/admin/DataTable';
import { KPICard } from '@/components/admin/charts/KPICard';
import { LineChart } from '@/components/admin/charts/LineChart';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Download, Users, Clock, CheckCircle2, Share2, Eye } from 'lucide-react';
import { TableRowActionsMenu } from '@/components/admin/TableRowActionsMenu.jsx';
import { format } from 'date-fns';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { exportToCSV } from '@/lib/csvExport';
import { publicFormUrl } from '@/lib/publicFormUrl';

function parseResponsesJson(row) {
  const raw = row.responses_json;
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return { _raw: raw };
    }
  }
  return {};
}

function buildExportRows(responses) {
  const rows = [];
  const keySet = new Set();
  for (const r of responses) {
    const answers = parseResponsesJson(r);
    Object.keys(answers).forEach((k) => keySet.add(k));
  }
  const qKeys = Array.from(keySet).sort();
  for (const r of responses) {
    const answers = parseResponsesJson(r);
    const base = {
      submitted_at: r.submitted_at || r.created_at || '',
      respondent_email: r.respondent_email || '',
      completion_time_seconds: r.completion_time_seconds ?? '',
    };
    const flat = { ...base };
    for (const k of qKeys) {
      const v = answers[k];
      flat[`question_${k}`] = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
    rows.push(flat);
  }
  return rows;
}

export default function FormResponsesPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const formRes = await apiServerClient.fetch(`/forms/${formId}`);
        if (!formRes.ok) {
          const err = await formRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to load form');
        }
        const formData = await formRes.json();
        setForm(formData);

        const respRes = await apiServerClient.fetch(`/forms/${formId}/responses?page=${page}&limit=15`);
        if (!respRes.ok) {
          const err = await respRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to load responses');
        }
        const respData = await respRes.json();
        setResponses(respData.items || []);
        setTotalPages(respData.totalPages || 1);
        setAnalytics(respData.analytics || {});
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load responses');
      } finally {
        setIsLoading(false);
      }
    };
    if (formId) void fetchData();
  }, [formId, page]);

  const timelineChartData = useMemo(() => {
    const tl = analytics?.response_timeline;
    if (!tl || typeof tl !== 'object') return [];
    return Object.entries(tl)
      .map(([date, count]) => ({ date, count: Number(count) || 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [analytics]);

  const handleExport = async () => {
    try {
      const res = await apiServerClient.fetch(`/forms/${formId}/responses?page=1&limit=500`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Export failed');
      }
      const data = await res.json();
      const items = data.items || [];
      if (items.length === 0) {
        toast.message('No responses to export');
        return;
      }
      const rows = buildExportRows(items);
      exportToCSV(rows, `form-${formId}-responses`);
      toast.success(`Exported ${rows.length} row(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const openDetail = (row) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  const columns = [
    {
      key: 'submitted_at',
      label: 'Date',
      render: (r) => {
        const ts = r.submitted_at || r.created_at;
        if (!ts) return '—';
        try {
          return format(new Date(ts), 'MMM d, yyyy HH:mm');
        } catch {
          return String(ts);
        }
      },
    },
    { key: 'respondent_email', label: 'Respondent', render: (r) => r.respondent_email || 'Anonymous' },
    {
      key: 'completion_time_seconds',
      label: 'Time Taken',
      render: (r) =>
        r.completion_time_seconds
          ? `${Math.floor(r.completion_time_seconds / 60)}m ${r.completion_time_seconds % 60}s`
          : 'N/A',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <TableRowActionsMenu items={[{ label: 'View details', icon: Eye, onClick: () => openDetail(r) }]} />
      ),
    },
  ];

  const detailAnswers = detailRow ? parseResponsesJson(detailRow) : {};

  const questionLabelById = useMemo(() => {
    const m = new Map();
    for (const q of form?.questions || []) {
      m.set(q.id, q.question_text || String(q.id));
    }
    return m;
  }, [form]);

  if (isLoading && !form) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/form-responses')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold">{form?.name} Responses</h1>
            <p className="text-muted-foreground">Analyze submissions and completion metrics.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(publicFormUrl(formId));
              toast.success('Form link copied to clipboard');
            }}
          >
            <Share2 className="h-4 w-4" /> Share link
          </Button>
          <Button className="gap-2 bg-primary-gradient" type="button" onClick={() => void handleExport()}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="analytics-grid">
        <KPICard title="Total Responses" value={analytics?.total_responses || 0} icon={Users} />
        <KPICard title="Completion Rate" value={`${analytics?.completion_rate ?? 0}%`} icon={CheckCircle2} />
        <KPICard title="Avg Time" value={`${Math.round((analytics?.avg_completion_time_seconds || 0) / 60)}m`} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="admin-card-shadow border-none">
          <CardHeader>
            <CardTitle>Response timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineChartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <LineChart
                data={timelineChartData}
                series={[{ key: 'count', name: 'Responses' }]}
                xKey="date"
              />
            )}
          </CardContent>
        </Card>

        <Card className="admin-card-shadow border-none">
          <CardHeader>
            <CardTitle>Individual submissions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4">
              <DataTable
                columns={columns}
                data={responses}
                isLoading={isLoading}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission details</DialogTitle>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-1 text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">Email:</span>{' '}
                  {detailRow.respondent_email || '—'}
                </span>
                <span>
                  <span className="font-medium text-foreground">Submitted:</span>{' '}
                  {detailRow.submitted_at || detailRow.created_at
                    ? format(new Date(detailRow.submitted_at || detailRow.created_at), 'PPpp')
                    : '—'}
                </span>
                <span>
                  <span className="font-medium text-foreground">Time:</span>{' '}
                  {detailRow.completion_time_seconds != null
                    ? `${detailRow.completion_time_seconds}s`
                    : '—'}
                </span>
              </div>
              <div className="border-t border-border pt-3">
                <p className="mb-2 font-medium text-foreground">Answers</p>
                <ul className="space-y-2">
                  {Object.entries(detailAnswers).map(([qid, val]) => (
                    <li key={qid} className="rounded-md bg-muted/50 p-2">
                      <span className="block text-xs font-medium text-foreground">{questionLabelById.get(qid) || qid}</span>
                      <span className="whitespace-pre-wrap break-words">
                        {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                      </span>
                    </li>
                  ))}
                </ul>
                {Object.keys(detailAnswers).length === 0 && (
                  <p className="text-muted-foreground">No parsed answers.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
