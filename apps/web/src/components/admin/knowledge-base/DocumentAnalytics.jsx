
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KPICard } from '@/components/admin/charts/KPICard';
import { LineChart } from '@/components/admin/charts/LineChart';
import { PieChart } from '@/components/admin/charts/PieChart';
import { BarChart } from '@/components/admin/charts/BarChart';
import { FileText, Database, Activity, AlertCircle } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';

export function DocumentAnalytics() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await apiServerClient.fetch('/knowledge-base/analytics');
        const result = await response.json();
        setData(result);
      } catch (err) {
        toast.error('Failed to load knowledge base analytics');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (isLoading) return <div className="p-12 flex justify-center"><LoadingSpinner size="lg" /></div>;
  if (!data) return null;

  const contentTypeData = Object.entries(data.by_content_type || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="analytics-grid">
        <KPICard title="Total Documents" value={data.total_documents || 0} icon={FileText} trend={12} />
        <KPICard title="Total Storage Used" value={`${(data.total_file_size_mb || 0).toFixed(2)} MB`} icon={Database} trend={5} />
        <KPICard title="Indexed Documents" value={data.indexing_status?.indexed || 0} icon={Activity} />
        <KPICard title="Pending/Failed" value={(data.indexing_status?.pending || 0) + (data.indexing_status?.failed || 0)} icon={AlertCircle} trend={0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none admin-card-shadow">
          <CardHeader><CardTitle>Upload Trend (30 Days)</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={data.upload_trend || []} series={[{ key: 'count', name: 'Uploads' }]} xKey="date" />
          </CardContent>
        </Card>

        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Documents by Type</CardTitle></CardHeader>
          <CardContent>
            <PieChart data={contentTypeData} donut />
          </CardContent>
        </Card>
      </div>

      {data.most_referenced_documents?.length > 0 && (
        <Card className="border-none admin-card-shadow">
          <CardHeader><CardTitle>Largest Documents (By Chunk Count)</CardTitle></CardHeader>
          <CardContent>
            <BarChart 
              data={data.most_referenced_documents} 
              xKey="title" 
              series={[{ key: 'chunk_count', name: 'Chunks' }]} 
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
