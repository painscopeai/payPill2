import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronsUpDown } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { cn } from '@/lib/utils';
import { maxTimestamp, sortByRecencyDesc } from '@/lib/sortByRecency';
import { DataTablePagination } from '@/components/DataTablePagination.jsx';
import { useClientDataTablePagination } from '@/hooks/useClientDataTablePagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/dataTablePagination';

/**
 * Provider-portal datatable: sortable headers, loading row, hover rows (aligned with admin DataTable UX).
 * @param {{ key: string, label: string, sortable?: boolean, className?: string, render?: (row: object) => React.ReactNode }[]} columns
 * @param {object[]} data
 * @param {boolean} isLoading
 * @param {(row: object) => string} [getRowId] stable row id for keys
 */
export function ProviderDataTable({
	columns,
	data,
	isLoading,
	emptyMessage = 'No results found',
	getRowId = (row) => String(row.id ?? row.patient_id ?? ''),
	defaultSortKey = null,
	defaultSortDesc = false,
	pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
}) {
	const [sortCol, setSortCol] = useState(defaultSortKey);
	const [sortDesc, setSortDesc] = useState(defaultSortDesc ?? !defaultSortKey);

	const handleSort = (key) => {
		if (!key) return;
		if (sortCol === key) {
			setSortDesc((d) => !d);
		} else {
			setSortCol(key);
			setSortDesc(false);
		}
	};

	const sortedData = useMemo(() => {
		const list = [...(data || [])];
		if (!list.length) return list;
		if (!sortCol) {
			return sortByRecencyDesc(list, (row) =>
				maxTimestamp(
					row.last_activity_at,
					row.last_activity_sort,
					row.updated_at,
					row.created_at,
					row.appointment_date,
					row.last_visit_sort,
					row.next_visit_sort,
				),
			);
		}
		const mult = sortDesc ? -1 : 1;
		list.sort((a, b) => {
			const va = a[sortCol];
			const vb = b[sortCol];
			if (va == null && vb == null) return 0;
			if (va == null) return 1 * mult;
			if (vb == null) return -1 * mult;
			if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult;
			const sa = String(va).toLowerCase();
			const sb = String(vb).toLowerCase();
			if (sa < sb) return -1 * mult;
			if (sa > sb) return 1 * mult;
			return 0;
		});
		return list;
	}, [data, sortCol, sortDesc]);

	const { page, pageSize, totalPages, totalCount, pagedRows, onPageChange, onPageSizeChange } =
		useClientDataTablePagination(sortedData, initialPageSize);

	return (
		<div className="w-full space-y-4">
			<div className="w-full rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm">
				<div className="w-full overflow-x-auto">
					<Table className="w-full min-w-full">
						<TableHeader className="bg-muted/50">
							<TableRow>
								{columns.map((col, idx) => (
									<TableHead
										key={col.key || idx}
										className={cn(
											'whitespace-nowrap font-semibold text-muted-foreground',
											col.sortable ? 'cursor-pointer select-none hover:text-foreground' : '',
											col.className,
										)}
										onClick={() => col.sortable && handleSort(col.key)}
									>
										<div className="flex items-center gap-1">
											{col.label}
											{col.sortable ? <ChevronsUpDown className="h-3 w-3 opacity-50" /> : null}
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
							) : totalCount === 0 ? (
								<TableRow>
									<TableCell colSpan={columns.length} className="min-h-32 py-8 text-center text-muted-foreground align-top">
										{emptyMessage}
									</TableCell>
								</TableRow>
							) : (
								pagedRows.map((row, rIdx) => (
									<TableRow key={getRowId(row) || rIdx} className="transition-colors hover:bg-muted/40">
										{columns.map((col, cIdx) => (
											<TableCell key={col.key || cIdx} className="align-middle py-3">
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
					onPageSizeChange={onPageSizeChange}
				/>
			) : null}
		</div>
	);
}

export default ProviderDataTable;
