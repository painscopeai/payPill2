
import React, { useState, useEffect } from 'react';
import { adminPagedList } from '@/lib/adminSupabaseList.js';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { StatusBadge } from '@/components/admin/StatusBadge.jsx';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AILogsPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { items } = await adminPagedList('ai_logs', 1, 20, {});
        setData(items);
      } catch (error) {
        toast.error('Failed to fetch AI logs');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { key: 'created', label: 'Timestamp', render: (r) => format(new Date(r.created), 'MMM d, HH:mm:ss') },
    { key: 'ai_input', label: 'Input', render: (r) => <div className="max-w-[200px] truncate">{r.ai_input}</div> },
    { key: 'ai_output', label: 'Output', render: (r) => <div className="max-w-[200px] truncate">{r.ai_output}</div> },
    { key: 'processing_time_ms', label: 'Time (ms)', render: (r) => <span className="font-mono">{r.processing_time_ms ?? '—'}ms</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">AI Processing Logs</h1>
        <p className="text-muted-foreground">Monitor AI performance, outputs, and errors.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <DataTable columns={columns} data={data} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
