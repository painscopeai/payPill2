
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export function ExportButton({ data, filename = 'export' }) {
  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }
    toast.success(`Exporting ${data.length} rows to CSV...`);
    // Real implementation would use papaparse here
  };

  const handleExportExcel = () => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }
    toast.success(`Exporting ${data.length} rows to Excel...`);
    // Real implementation would use xlsx here
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>Export as Excel</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
