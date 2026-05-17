import React from 'react';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, pageRangeLabel } from '@/lib/dataTablePagination';
import { cn } from '@/lib/utils';

/**
 * Shared footer for datatables: rows-per-page, range label, prev/next.
 */
export function DataTablePagination({
	page,
	totalPages,
	totalCount,
	pageSize = DEFAULT_PAGE_SIZE,
	onPageChange,
	onPageSizeChange,
	pageSizeOptions = PAGE_SIZE_OPTIONS,
	className,
}) {
	const tp = Math.max(1, totalPages);
	const canPaginate = tp > 1;

	if (totalCount <= 0 && !onPageSizeChange) return null;

	return (
		<div
			className={cn(
				'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1',
				className,
			)}
		>
			<p className="text-sm text-muted-foreground tabular-nums">{pageRangeLabel(page, pageSize, totalCount)}</p>
			<div className="flex flex-wrap items-center gap-3 sm:justify-end">
				{onPageSizeChange ? (
					<div className="flex items-center gap-2 text-sm">
						<span className="text-muted-foreground whitespace-nowrap">Rows per page</span>
						<Select
							value={String(pageSize)}
							onValueChange={(v) => onPageSizeChange(Number.parseInt(v, 10) || DEFAULT_PAGE_SIZE)}
						>
							<SelectTrigger className="h-8 w-[4.5rem] bg-background">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{pageSizeOptions.map((n) => (
									<SelectItem key={n} value={String(n)}>
										{n}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				) : null}
				{canPaginate && onPageChange ? (
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground tabular-nums">
							Page {page} of {tp}
						</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-8 w-8 p-0"
							onClick={() => onPageChange(Math.max(1, page - 1))}
							disabled={page <= 1}
							aria-label="Previous page"
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-8 w-8 p-0"
							onClick={() => onPageChange(Math.min(tp, page + 1))}
							disabled={page >= tp}
							aria-label="Next page"
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
}
