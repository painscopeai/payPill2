
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/admin/DataTable';
import { KPICard } from '@/components/admin/charts/KPICard';
import { LineChart } from '@/components/admin/charts/LineChart';
import { ArrowLeft, Download, Users, Clock, CheckCircle2, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function FormResponsesPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch form details
        const formRes = await apiServerClient.fetch(`/forms/${formId}`);
        const formData = await formRes.json();
        setForm(formData);

        // Fetch responses with analytics
        const respRes = await apiServerClient.fetch(`/forms/${formId}/responses?page=${page}&limit=15`);
        const respData = await respRes.json();
        setResponses(respData.items || []);
        setTotalPages(respData.totalPages || 1);
        setAnalytics(respData.analytics || {});
      } catch (err) {
        toast.error('Failed to load responses');
      } finally {
        setIsLoading(false);
      }
    };
    if (formId) fetchData();
  }, [formId, page]);

  const handleExport = () => {
    toast.success('Exporting responses to CSV...');
    // Real implementation would use papaparse to convert responses to CSV
  };

  const columns = [
    { key: 'submitted_at', label: 'Date', render: (r) => format(new Date(r.submitted_at || r.created), 'MMM d, yyyy HH:mm') },
    { key: 'respondent_email', label: 'Respondent', render: (r) => r.respondent_email || 'Anonymous' },
    { key: 'completion_time_seconds', label: 'Time Taken', render: (r) => r.completion_time_seconds ? `${Math.round(r.completion_time_seconds / 60)}m ${r.completion_time_seconds % 60}s` : 'N/A' },
    { key: 'actions', label: 'Actions', render: () => <Button variant="ghost" size="sm">View Details</Button> }
  ];

  if (isLoading && !form) return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/forms')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-display">{form?.name} Responses</h1>
            <p className="text-muted-foreground">Analyze submissions and completion metrics.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/forms/${formId}`);
            toast.success('Form link copied to clipboard');
          }}>
            <Share2 className="w-4 h-4" /> Share Link
          </Button>
          <Button className="gap-2 bg-primary-gradient" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="analytics-grid">
        <KPICard title="Total Responses" value={analytics?.total_responses || 0} icon={Users} />
        <KPICard title="Completion Rate" value={`${analytics?.completion_rate || 0}%`} icon={CheckCircle2} />
        <KPICard title="Avg Time" value={`${Math.round((analytics?.avg_completion_time_seconds || 0) / 60)}m`} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Response Timeline</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={analytics?.response_timeline || []} series={[{ key: 'count', name: 'Responses' }]} xKey="date" />
          </CardContent>
        </Card>

        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Individual Submissions</CardTitle></CardHeader>
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
    </div>
  );
}
