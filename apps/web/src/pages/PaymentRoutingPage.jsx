import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import DataTable from '@/components/DataTable.jsx';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const mockRules = [
  { id: 'R-001', name: 'Out-of-Network ER', priority: 1, status: 'Active', lastUpdated: '2026-04-01' },
  { id: 'R-002', name: 'Preventive Care 100%', priority: 2, status: 'Active', lastUpdated: '2026-03-15' },
  { id: 'R-003', name: 'Specialty Pharmacy Tier 4', priority: 3, status: 'Testing', lastUpdated: '2026-04-20' },
];

export default function PaymentRoutingPage() {
  const columns = [
    { header: 'Rule ID', accessorKey: 'id', cell: (row) => <div className="font-medium">{row.id}</div> },
    { header: 'Rule Name', accessorKey: 'name' },
    { header: 'Priority', accessorKey: 'priority' },
    { header: 'Status', accessorKey: 'status' },
    { header: 'Last Updated', accessorKey: 'lastUpdated' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Payment Routing - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Routing Rules</h1>
            <p className="text-muted-foreground mt-1">Configure automated claims adjudication and routing logic.</p>
          </div>
          <Button className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> New Rule
          </Button>
        </div>

        <DataTable columns={columns} data={mockRules} />
      </main>
    </div>
  );
}