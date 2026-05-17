
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronsUpDown, Trash2 } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { TableRowActionsMenu } from '@/components/admin/TableRowActionsMenu.jsx';
import { confirmDeleteRecord, deleteMenuItem } from '@/lib/adminDeleteMenu.js';
import { cn } from '@/lib/utils';
import { DataTablePagination } from '@/components/DataTablePagination.jsx';
import { useClientDataTablePagination } from '@/hooks/useClientDataTablePagination';
import { clampPage, DEFAULT_PAGE_SIZE, totalPagesForCount } from '@/lib/dataTablePagination';

function rowKeyOf(row, index, getRowId) {
  const id = getRowId ? getRowId(row) : row?.id;
  return id != null ? String(id) : `row-${index}`;
}

export function DataTable({
  columns,
  data,
  isLoading,
  onSort,
  page: controlledPage = 1,
  totalPages: controlledTotalPages,
  totalCount: controlledTotalCount,
  pageSize: controlledPageSize = DEFAULT_PAGE_SIZE,
  onPageChange: controlledOnPageChange,
  onPageSizeChange: controlledOnPageSizeChange,
  selectedRowId,
  onRowClick,
  selectable = false,
  onDeleteRows,
  getRowDeleteLabel,
  getRowId,
}) {
  const serverPaginated = typeof controlledOnPageChange === 'function';
  const clientPagination = useClientDataTablePagination(
    serverPaginated ? [] : data || [],
    controlledPageSize,
  );

  const page = serverPaginated ? controlledPage : clientPagination.page;
  const pageSize = serverPaginated ? controlledPageSize : clientPagination.pageSize;
  const totalCount = serverPaginated
    ? (controlledTotalCount ?? (data || []).length)
    : clientPagination.totalCount;
  const totalPages = serverPaginated
    ? (controlledTotalPages ?? totalPagesForCount(totalCount, pageSize))
    : clientPagination.totalPages;
  const onPageChange = serverPaginated ? controlledOnPageChange : clientPagination.onPageChange;
  const onPageSizeChange = serverPaginated
    ? controlledOnPageSizeChange
    : clientPagination.onPageSizeChange;

  const displayData = useMemo(
    () => (serverPaginated ? data || [] : clientPagination.pagedRows),
    [serverPaginated, data, clientPagination.pagedRows],
  );

  useEffect(() => {
    if (!serverPaginated) return;
    const tp = totalPagesForCount(totalCount, pageSize);
    if (page > tp) controlledOnPageChange(clampPage(page, tp));
  }, [serverPaginated, page, pageSize, totalCount, controlledOnPageChange]);
  const [sortCol, setSortCol] = useState(null);
  const [sortDesc, setSortDesc] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  const canDelete = typeof onDeleteRows === 'function';
  const showSelection = selectable && canDelete;

  const keyedRows = useMemo(
    () => displayData.map((row, index) => ({ row, key: rowKeyOf(row, index, getRowId) })),
    [displayData, getRowId],
  );

  const allSelected =
    keyedRows.length > 0 && keyedRows.every(({ key }) => selectedKeys.has(key));

  const labelForRow = useCallback(
    (row) => {
      if (getRowDeleteLabel) return getRowDeleteLabel(row);
      return row.name || row.label || row.email || row.title || row.id || 'this record';
    },
    [getRowDeleteLabel],
  );

  const runDelete = useCallback(
    async (rows) => {
      if (!rows.length || !onDeleteRows) return;
      const names = rows.map(labelForRow).slice(0, 3);
      const suffix = rows.length > 3 ? ` and ${rows.length - 3} more` : '';
      const summary = names.join(', ') + suffix;
      const message =
        rows.length === 1
          ? undefined
          : `Delete ${rows.length} records (${summary})? This cannot be undone.`;
      if (!confirmDeleteRecord(summary, { message })) return;
      await onDeleteRows(rows);
      setSelectedKeys(new Set());
    },
    [onDeleteRows, labelForRow],
  );

  const hasActionsCol = columns.some((col) => col.key === 'actions');
  const effectiveColumns = useMemo(() => {
    if (!canDelete || hasActionsCol) return columns;
    return [
      ...columns,
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => (
          <div onClick={(e) => e.stopPropagation()}>
            <TableRowActionsMenu
              items={[
                deleteMenuItem({
                  displayName: labelForRow(row),
                  onDelete: () => runDelete([row]),
                }),
              ]}
            />
          </div>
        ),
      },
    ];
  }, [canDelete, hasActionsCol, columns, labelForRow, runDelete]);

  const handleSort = (key) => {
    if (!key) return;
    const isDesc = sortCol === key ? !sortDesc : false;
    setSortCol(key);
    setSortDesc(isDesc);
    if (onSort) onSort(key, isDesc);
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(keyedRows.map(({ key }) => key)));
    }
  };

  const toggleRow = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedRows = keyedRows
    .filter(({ key }) => selectedKeys.has(key))
    .map(({ row }) => row);

  const colSpan = effectiveColumns.length + (showSelection ? 1 : 0);

  return (
    <div className="w-full space-y-4">
      {showSelection && selectedKeys.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
          <p className="text-sm text-muted-foreground">{selectedKeys.size} selected</p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => void runDelete(selectedRows)}
          >
            <Trash2 className="h-4 w-4" />
            Delete selected
          </Button>
        </div>
      ) : null}

      <div className="w-full rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden bg-[hsl(var(--admin-card))] shadow-sm">
        <div className="w-full overflow-x-auto">
          <Table className="w-full min-w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                {showSelection ? (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all rows"
                    />
                  </TableHead>
                ) : null}
                {effectiveColumns.map((col, idx) => (
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
                  <TableCell colSpan={colSpan} className="h-32 text-center">
                    <LoadingSpinner size="md" />
                  </TableCell>
                </TableRow>
              ) : keyedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-32 text-center text-muted-foreground">
                    No results found
                  </TableCell>
                </TableRow>
              ) : (
                keyedRows.map(({ row, key }) => (
                  <TableRow
                    key={key}
                    className={cn(
                      'admin-table-row',
                      onRowClick && 'cursor-pointer transition-colors hover:bg-muted/50',
                      selectedRowId != null &&
                        row.id === selectedRowId &&
                        'bg-muted/70 ring-1 ring-inset ring-primary/20',
                      showSelection && selectedKeys.has(key) && 'bg-muted/40',
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {showSelection ? (
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedKeys.has(key)}
                          onCheckedChange={() => toggleRow(key)}
                          aria-label="Select row"
                        />
                      </TableCell>
                    ) : null}
                    {effectiveColumns.map((col, cIdx) => (
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

      {!isLoading ? (
        <DataTablePagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange ?? clientPagination.onPageSizeChange}
        />
      ) : null}
    </div>
  );
}
