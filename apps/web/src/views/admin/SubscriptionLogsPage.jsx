
import React, { useCallback, useEffect, useState } from 'react';
import { adminPagedList } from '@/lib/adminSupabaseList.js';
import { deleteAdminDataTableRow } from '@/lib/adminDataDelete.js';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SubscriptionLogsPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { items } = await adminPagedList('subscription_logs', 1, 20, {});
      setData(items);
    } catch {
      toast.error('Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleDeleteRows = async (rows) => {
    try {
      for (const row of rows) {
        await deleteAdminDataTableRow('subscription_logs', row.id);
      }
      toast.success(rows.length === 1 ? 'Log deleted' : `Deleted ${rows.length} logs`);
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

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
          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            selectable
            onDeleteRows={handleDeleteRows}
            getRowDeleteLabel={(r) => r.action || r.id?.substring(0, 8) || 'log entry'}
          />
        </CardContent>
      </Card>
    </div>
  );
}

