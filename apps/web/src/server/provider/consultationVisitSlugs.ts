/** Visit types that surface in the provider consultation workspace (matches booking catalog slugs). */
export const CONSULTATION_QUEUE_SLUGS = new Set(['consultation', 'follow-up']);

export function visitSlugFromAppointmentRow(row: {
	visit_types?: { slug?: string } | { slug?: string }[] | null;
	appointment_type?: string | null;
	type?: string | null;
}): string {
	const vt = row.visit_types;
	if (Array.isArray(vt) && vt[0]?.slug) return String(vt[0].slug).toLowerCase().trim();
	if (vt && typeof vt === 'object' && 'slug' in vt && (vt as { slug?: string }).slug) {
		return String((vt as { slug: string }).slug).toLowerCase().trim();
	}
	return String(row.appointment_type || row.type || '')
		.toLowerCase()
		.trim();
}

export function isConsultationQueueVisit(slug: string): boolean {
	return CONSULTATION_QUEUE_SLUGS.has(slug);
}
