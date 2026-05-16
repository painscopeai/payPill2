
import React, { useState, useEffect } from 'react';
import { adminPagedList } from '@/lib/adminSupabaseList.js';
import { deleteAdminDataTableRow } from '@/lib/adminDataDelete.js';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { SearchBar } from '@/components/admin/SearchBar.jsx';
import { StatusBadge } from '@/components/admin/StatusBadge.jsx';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SubscriptionAssignmentPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { items, totalPages: tp } = await adminPagedList('subscriptions', page, 15, {
        orIlike: searchTerm
          ? { columns: ['user_id', 'plan_id', 'status'], term: searchTerm }
          : undefined,
      });
      setData(items);
      setTotalPages(tp);
    } catch (error) {
      toast.error('Failed to fetch assignments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, page]);

  const handleDeleteRows = async (rows) => {
    try {
      for (const row of rows) {
        await deleteAdminDataTableRow('subscriptions', row.id);
      }
      toast.success(rows.length === 1 ? 'Subscription deleted' : `Deleted ${rows.length} subscriptions`);
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const columns = [
    { key: 'user_id', label: 'User ID', render: (r) => <span className="font-mono text-xs">{r.user_id.substring(0,8)}</span> },
    { key: 'user_type', label: 'Type' },
    { key: 'plan_id', label: 'Plan ID', render: (r) => <span className="font-mono text-xs">{r.plan_id.substring(0,8)}</span> },
    { 
      key: 'status', 
      label: 'Status', 
      render: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'start_date', 
      label: 'Start Date', 
      render: (row) => format(new Date(row.start_date || row.created), 'MMM d, yyyy')
    }
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-display">Subscription Assignment</h1>
          <p className="text-muted-foreground">Manage user subscriptions and overrides.</p>
        </div>
      </div>
      <Card className="w-full border-none shadow-sm">
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            selectable
            onDeleteRows={handleDeleteRows}
            getRowDeleteLabel={(r) => r.user_id?.substring(0, 8) || 'subscription'}
          />
        </CardContent>
      </Card>
    </div>
  );
}

