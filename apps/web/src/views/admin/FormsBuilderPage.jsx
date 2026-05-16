
import React, { useCallback, useEffect, useState } from 'react';
import { adminPagedList } from '@/lib/adminSupabaseList.js';
import { deleteAdminForm, removeRowsFromState } from '@/lib/adminDataDelete.js';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge.jsx';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function FormsBuilderPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { items } = await adminPagedList('forms', 1, 20, {});
      setData(items);
    } catch {
      toast.error('Failed to fetch forms');
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
        await deleteAdminForm(row.id);
      }
      removeRowsFromState(setData, rows);
      toast.success(rows.length === 1 ? 'Form deleted' : `Deleted ${rows.length} forms`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const columns = [
    { key: 'name', label: 'Form Name' },
    { key: 'form_type', label: 'Category', render: (r) => <span className="capitalize">{(r.form_type || '').replace('_',' ')}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> }
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-display">Forms Builder</h1>
          <p className="text-muted-foreground">Create dynamic questionnaires and assessments.</p>
        </div>
        <Button className="gap-2 bg-primary-gradient"><Plus className="w-4 h-4"/> Create Form</Button>
      </div>

      <Card className="w-full border-none shadow-sm">
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            selectable
            onDeleteRows={handleDeleteRows}
            getRowDeleteLabel={(r) => r.name || 'form'}
          />
        </CardContent>
      </Card>
    </div>
  );
}

