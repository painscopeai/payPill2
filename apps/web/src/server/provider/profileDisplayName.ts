/** Display name for a profile row (matches provider/patients list semantics). */
export function profileDisplayName(
	p: { first_name?: string | null; last_name?: string | null; name?: string | null; email?: string | null } | null,
): string {
	if (!p) return '';
	const n = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
	if (n) return n;
	return String(p.name || '').trim() || String(p.email || '').trim() || '';
}
