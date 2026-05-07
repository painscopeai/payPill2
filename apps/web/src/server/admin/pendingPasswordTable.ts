/**
 * Detects errors when `employer_employee_pending_passwords` is missing (migration not applied).
 * Allows imports/approval to proceed without approve-time password copy until DB is migrated.
 */
export function isPendingPasswordTableUnavailableError(
	err: { message?: string; code?: string; details?: string; hint?: string } | null | undefined,
): boolean {
	if (!err) return false;
	if (err.code === '42P01') return true;
	const blob = `${err.message || ''} ${err.details || ''} ${err.hint || ''}`.toLowerCase();
	return (
		blob.includes('employer_employee_pending_passwords') ||
		(blob.includes('schema cache') && blob.includes('could not find'))
	);
}
