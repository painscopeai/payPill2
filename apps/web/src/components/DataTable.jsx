import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function DataTable({
  columns,
  data,
  loading,
  emptyMessage = "No data available",
  onRowClick,
  selectedRowId,
  getRowId = (row) => row.id,
  stickyHeader = false,
  className = "",
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  const clickable = typeof onRowClick === "function";

  return (
    <div className={`rounded-2xl border border-border/60 overflow-hidden bg-card flex flex-col min-h-0 ${className}`}>
      <div className="overflow-auto flex-1 min-h-0">
        <Table>
          <TableHeader className={`bg-muted/50 ${stickyHeader ? "sticky top-0 z-10 shadow-sm" : ""}`}>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i} className="font-semibold text-muted-foreground whitespace-nowrap">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="min-h-32 py-8 text-center text-muted-foreground align-top">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => {
                const rowId = getRowId(row);
                const selected = selectedRowId != null && String(selectedRowId) === String(rowId);
                return (
                  <TableRow
                    key={String(rowId ?? rowIndex)}
                    data-state={selected ? "selected" : undefined}
                    className={[
                      "transition-colors",
                      clickable ? "cursor-pointer" : "",
                      selected
                        ? "bg-blue-50 hover:bg-blue-50 dark:bg-blue-950/40 dark:hover:bg-blue-950/50 border-l-4 border-l-blue-600"
                        : "hover:bg-muted/30",
                    ].join(" ")}
                    onClick={clickable ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((col, colIndex) => (
                      <TableCell key={colIndex} className="py-3.5 align-middle">
                        {col.cell ? col.cell(row) : row[col.accessorKey]}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}