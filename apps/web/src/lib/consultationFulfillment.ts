export const FULFILLMENT_MODE_ASSIGNED = 'assigned' as const;
export const FULFILLMENT_MODE_PATIENT_CHOICE = 'patient_choice' as const;

export type FulfillmentMode = typeof FULFILLMENT_MODE_ASSIGNED | typeof FULFILLMENT_MODE_PATIENT_CHOICE;

export type SectionFulfillment = {
	mode: FulfillmentMode;
	fulfillment_org_id: string | null;
	fulfillment_org_name: string | null;
};

export const DEFAULT_SECTION_FULFILLMENT: SectionFulfillment = {
	mode: FULFILLMENT_MODE_PATIENT_CHOICE,
	fulfillment_org_id: null,
	fulfillment_org_name: null,
};

export function parseSectionFulfillment(raw: unknown): SectionFulfillment {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return { ...DEFAULT_SECTION_FULFILLMENT };
	}
	const o = raw as Record<string, unknown>;
	const mode =
		o.mode === FULFILLMENT_MODE_ASSIGNED || o.mode === FULFILLMENT_MODE_PATIENT_CHOICE
			? o.mode
			: FULFILLMENT_MODE_PATIENT_CHOICE;
	const fulfillment_org_id =
		typeof o.fulfillment_org_id === 'string' && o.fulfillment_org_id.trim()
			? o.fulfillment_org_id.trim()
			: null;
	const fulfillment_org_name =
		typeof o.fulfillment_org_name === 'string' ? o.fulfillment_org_name.trim() || null : null;
	return { mode, fulfillment_org_id, fulfillment_org_name };
}

export function serializeSectionFulfillment(f: SectionFulfillment): SectionFulfillment {
	return {
		mode: f.mode,
		fulfillment_org_id: f.mode === FULFILLMENT_MODE_ASSIGNED ? f.fulfillment_org_id : null,
		fulfillment_org_name: f.mode === FULFILLMENT_MODE_ASSIGNED ? f.fulfillment_org_name : null,
	};
}

export function mergeFulfillmentIntoPayload(
	payload: Record<string, unknown>,
	section: SectionFulfillment,
): Record<string, unknown> {
	const serialized = serializeSectionFulfillment(section);
	return {
		...payload,
		fulfillment_mode: serialized.mode,
		fulfillment_org_id: serialized.fulfillment_org_id,
		fulfillment_org_name: serialized.fulfillment_org_name,
	};
}

/** Map booking catalog specialty to pending-fulfillment API kind. */
export function fulfillmentKindFromSpecialty(
	specialty: { slug?: string; operations_profile?: string | null } | null | undefined,
): 'pharmacy' | 'laboratory' | null {
	if (!specialty) return null;
	const op = String(specialty.operations_profile || '').trim().toLowerCase();
	if (op === 'pharmacist') return 'pharmacy';
	if (op === 'laboratory') return 'laboratory';
	const slug = String(specialty.slug || '').trim().toLowerCase();
	if (slug === 'pharmacy') return 'pharmacy';
	if (slug === 'laboratory') return 'laboratory';
	return null;
}

export function validateSectionFulfillmentForFinalize(
	section: SectionFulfillment,
	hasLines: boolean,
	sectionLabel: string,
): string | null {
	if (!hasLines) return null;
	if (section.mode === FULFILLMENT_MODE_ASSIGNED && !section.fulfillment_org_id) {
		return `Select a service provider for ${sectionLabel}, or choose "Allow patient to choose".`;
	}
	return null;
}
