
import React, { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { cn } from '@/lib/utils';

export function DataTable({ 
  columns, 
  data, 
  isLoading, 
  onSort,
  page = 1,
  totalPages = 1,
  onPageChange,
  selectedRowId,
  onRowClick,
}) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDesc, setSortDesc] = useState(false);

  const handleSort = (key) => {
    if (!key) return;
    const isDesc = sortCol === key ? !sortDesc : false;
    setSortCol(key);
    setSortDesc(isDesc);
    if (onSort) onSort(key, isDesc);
  };

  return (
    <div className="w-full space-y-4">
      <div className="w-full rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden bg-[hsl(var(--admin-card))] shadow-sm">
        <div className="w-full overflow-x-auto">
          <Table className="w-full min-w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                {columns.map((col, idx) => (
                  <TableHead 
                    key={idx} 
                    className={`whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && <ChevronsUpDown className="h-3 w-3 opacity-50" />}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <LoadingSpinner size="md" />
                  </TableCell>
                </TableRow>
              ) : data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    No results found
                  </TableCell>
                </TableRow>
              ) : (
                data?.map((row, rIdx) => (
                  <TableRow
                    key={row.id || rIdx}
                    className={cn(
                      'admin-table-row',
                      onRowClick && 'cursor-pointer transition-colors hover:bg-muted/50',
                      selectedRowId != null && row.id === selectedRowId && 'bg-muted/70 ring-1 ring-inset ring-primary/20',
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col, cIdx) => (
                      <TableCell key={cIdx} className="align-top">
                        {col.render ? col.render(row) : row[col.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

