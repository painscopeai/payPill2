import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/lib/dataTablePagination';

/** Page + page size state for server-paginated admin tables. */
export function useServerTablePagination(initialPageSize = DEFAULT_PAGE_SIZE) {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);

	const onPageSizeChange = useCallback((next) => {
		setPageSize(next);
		setPage(1);
	}, []);

	return {
		page,
		setPage,
		pageSize,
		totalPages,
		setTotalPages,
		totalCount,
		setTotalCount,
		onPageSizeChange,
	};
}
