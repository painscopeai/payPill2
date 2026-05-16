
import React, { useState, useEffect } from 'react';
import { adminPagedList } from '@/lib/adminSupabaseList.js';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SubscriptionLogsPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { items } = await adminPagedList('subscription_logs', 1, 20, {});
        setData(items);
      } catch (error) {
        toast.error('Failed to fetch logs');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { key: 'created', label: 'Timestamp', render: (r) => format(new Date(r.created), 'MMM d, yyyy HH:mm:ss') },
    { key: 'action', label: 'Action', render: (r) => <span className="font-medium">{r.action}</span> },
    { key: 'subscription_id', label: 'Sub ID', render: (r) => <span className="font-mono text-xs">{(r.subscription_id || '').toString().substring(0,8)}</span> },
    { key: 'reason', label: 'Reason' },
  ];

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Subscription Logs</h1>
        <p className="text-muted-foreground">Audit trail for all subscription changes.</p>
      </div>
      <Card className="w-full border-none shadow-sm">
        <CardContent className="p-4">
          <DataTable columns={columns} data={data} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}

