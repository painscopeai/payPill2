
import React, { useState, useEffect } from 'react';
import { adminPagedList } from '@/lib/adminSupabaseList.js';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { SearchBar } from '@/components/admin/SearchBar.jsx';
import { StatusBadge } from '@/components/admin/StatusBadge.jsx';
import { toast } from 'sonner';

export default function ProvidersManagementPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { items } = await adminPagedList('providers', 1, 20, {
          searchColumn: searchTerm ? 'name' : undefined,
          searchTerm: searchTerm || undefined,
        });
        setData(items);
      } catch (error) {
        toast.error('Failed to fetch providers');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [searchTerm]);

  const columns = [
    { key: 'name', label: 'Provider Name' },
    { key: 'category', label: 'Category' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'verification_status', label: 'Verification', render: (r) => <StatusBadge status={r.verification_status} /> }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Provider Management</h1>
        <p className="text-muted-foreground">Approve and manage marketplace providers.</p>
      </div>
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border bg-muted/20">
            <SearchBar placeholder="Search providers..." onSearch={setSearchTerm} className="max-w-md" />
          </div>
          <div className="p-4">
            <DataTable columns={columns} data={data} isLoading={isLoading} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
