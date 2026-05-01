
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { adminPagedList } from '@/lib/adminSupabaseList.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/admin/DataTable.jsx';
import { SearchBar } from '@/components/admin/SearchBar.jsx';
import { ExportButton } from '@/components/admin/ExportButton.jsx';
import { FilterPanel } from '@/components/admin/FilterPanel.jsx';
import { StatusBadge } from '@/components/admin/StatusBadge.jsx';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog.jsx';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { MoreHorizontal, Building2, Eye, Ban, CheckCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function EmployersManagementPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEmployer, setSelectedEmployer] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { items, totalPages: tp } = await adminPagedList('employers', page, 10, {
        searchColumn: searchTerm ? 'name' : undefined,
        searchTerm: searchTerm || undefined,
        statusColumn: 'status',
        statusFilter: statusFilter,
      });
      setData(items);
      setTotalPages(tp);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch employers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, statusFilter, page]);

  const handleAction = async (id, action) => {
    try {
      const newStatus = action === 'suspend' ? 'inactive' : 'active';
      const { error } = await supabase.from('employers').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      toast.success(`Employer ${newStatus}`);
      fetchData();
    } catch (e) {
      toast.error('Action failed');
    }
  };

  const columns = [
    { key: 'name', label: 'Company Name', sortable: true },
    { key: 'industry', label: 'Industry', sortable: true },
    { key: 'employee_count', label: 'Employees', sortable: true },
    { 
      key: 'status', 
      label: 'Status', 
      render: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'created', 
      label: 'Registered', 
      render: (row) => format(new Date(row.created), 'MMM d, yyyy')
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { setSelectedEmployer(row); setIsDetailsOpen(true); }}>
              <Eye className="w-4 h-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.status === 'active' ? (
              <DropdownMenuItem onClick={() => handleAction(row.id, 'suspend')} className="text-warning">
                <Ban className="w-4 h-4 mr-2" /> Suspend
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handleAction(row.id, 'activate')} className="text-success">
                <CheckCircle className="w-4 h-4 mr-2" /> Activate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Employers Management</h1>
          <p className="text-muted-foreground">Manage corporate clients and their subscriptions.</p>
        </div>
        <ExportButton data={data} filename="employers" />
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
            <SearchBar 
              placeholder="Search companies..." 
              onSearch={setSearchTerm} 
              className="w-full sm:w-96" 
            />
            <FilterPanel activeFiltersCount={statusFilter !== 'all' ? 1 : 0} onReset={() => setStatusFilter('all')}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FilterPanel>
          </div>
          
          <div className="p-4">
            <DataTable 
              columns={columns} 
              data={data} 
              isLoading={isLoading} 
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {selectedEmployer?.name} Details
            </DialogTitle>
            <DialogDescription>Full corporate profile and subscription details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Industry</p>
                <p className="font-medium">{selectedEmployer?.industry || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Employees</p>
                <p className="font-medium">{selectedEmployer?.employee_count || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="font-medium">{selectedEmployer?.address || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <StatusBadge status={selectedEmployer?.status} className="mt-1" />
              </div>
            </div>
            {/* Mocked Analytics section */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Subscription Analytics</h4>
              <p className="text-sm text-muted-foreground">Active Plan: {selectedEmployer?.plan_type || 'Basic'}</p>
              <p className="text-sm text-muted-foreground">Utilization: 78%</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
            <Button>Edit Employer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
