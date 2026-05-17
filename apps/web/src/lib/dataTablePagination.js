/** Default rows shown per page across app datatables. */
export const DEFAULT_PAGE_SIZE = 20;

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function clampPage(page, totalPages) {
	const tp = Math.max(1, totalPages);
	return Math.min(Math.max(1, page), tp);
}

export function totalPagesForCount(totalCount, pageSize) {
	const size = Math.max(1, pageSize);
	return Math.max(1, Math.ceil(Math.max(0, totalCount) / size));
}

export function slicePageRows(rows, page, pageSize) {
	const size = Math.max(1, pageSize);
	const start = (clampPage(page, totalPagesForCount(rows.length, size)) - 1) * size;
	return rows.slice(start, start + size);
}

export function pageRangeLabel(page, pageSize, totalCount) {
	if (totalCount <= 0) return 'No records';
	const size = Math.max(1, pageSize);
	const safePage = clampPage(page, totalPagesForCount(totalCount, size));
	const start = (safePage - 1) * size + 1;
	const end = Math.min(safePage * size, totalCount);
	return `Showing ${start}–${end} of ${totalCount}`;
}
