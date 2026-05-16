
import React, { useState, useEffect } from 'react';
import { adminPagedList } from '@/lib/adminSupabaseList.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { SearchBar } from '@/components/admin/SearchBar.jsx';
import { StatusBadge } from '@/components/admin/StatusBadge.jsx';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscriptionPlansPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { items } = await adminPagedList('subscription_plans', 1, 50, {
        searchColumn: searchTerm ? 'name' : undefined,
        searchTerm: searchTerm || undefined,
      });
      setData(items);
    } catch (error) {
      toast.error('Failed to fetch plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const columns = [
    { key: 'name', label: 'Plan Name', sortable: true },
    { key: 'plan_type', label: 'Target Audience' },
    { 
      key: 'price_monthly', 
      label: 'Monthly Price',
      render: (r) => `$${r.price_monthly || 0}`
    },
    { key: 'billing_cycle', label: 'Billing Cycle', render: (r) => <span className="capitalize">{r.billing_cycle}</span> },
    { 
      key: 'status', 
      label: 'Status', 
      render: (row) => <StatusBadge status={row.status} />
    }
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-display">Subscription Plans</h1>
          <p className="text-muted-foreground">Manage pricing tiers and limits.</p>
        </div>
        <Button className="gap-2 bg-primary-gradient"><Plus className="w-4 h-4"/> Create Plan</Button>
      </div>

      <Card className="w-full border-none shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border bg-muted/20">
            <SearchBar placeholder="Search plans..." onSearch={setSearchTerm} className="max-w-md" />
          </div>
          <div className="p-4">
            <DataTable columns={columns} data={data} isLoading={isLoading} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

