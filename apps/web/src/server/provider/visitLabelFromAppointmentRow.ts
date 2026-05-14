import { visitSlugFromAppointmentRow } from '@/server/provider/consultationVisitSlugs';

export function visitLabelFromAppointmentRow(row: {
	visit_types?: { label?: string; slug?: string } | { label?: string; slug?: string }[] | null;
	appointment_type?: string | null;
	type?: string | null;
}): string {
	const vt = row.visit_types;
	if (Array.isArray(vt) && vt[0]) {
		const label = vt[0].label;
		if (label) return String(label).trim();
	}
	if (vt && typeof vt === 'object' && !Array.isArray(vt) && 'label' in vt) {
		const label = (vt as { label?: string }).label;
		if (label) return String(label).trim();
	}
	const slug = visitSlugFromAppointmentRow(row);
	if (slug) return slug.charAt(0).toUpperCase() + slug.slice(1);
	return String(row.appointment_type || row.type || 'Consultation').trim() || 'Consultation';
}
