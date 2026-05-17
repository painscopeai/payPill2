import { useEffect, useMemo, useState } from 'react';
import {
	clampPage,
	DEFAULT_PAGE_SIZE,
	slicePageRows,
	totalPagesForCount,
} from '@/lib/dataTablePagination';

/**
 * Client-side pagination for datatables that receive the full row set.
 */
export function useClientDataTablePagination(rows, initialPageSize = DEFAULT_PAGE_SIZE) {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(initialPageSize);

	const totalCount = (rows || []).length;
	const totalPages = totalPagesForCount(totalCount, pageSize);

	useEffect(() => {
		setPage((p) => clampPage(p, totalPages));
	}, [totalPages, totalCount, pageSize]);

	const pagedRows = useMemo(
		() => slicePageRows(rows || [], page, pageSize),
		[rows, page, pageSize],
	);

	const onPageChange = (next) => setPage(clampPage(next, totalPages));

	const onPageSizeChange = (nextSize) => {
		setPageSize(nextSize);
		setPage(1);
	};

	return {
		page,
		pageSize,
		totalPages,
		totalCount,
		pagedRows,
		onPageChange,
		onPageSizeChange,
	};
}
