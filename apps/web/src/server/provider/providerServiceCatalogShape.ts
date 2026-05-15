type AttRow = {
	attachment_kind: string;
	forms:
		| { id: string; name: string; status: string; form_type: string }
		| { id: string; name: string; status: string; form_type: string }[]
		| null;
};

type SvcOut = Record<string, unknown> & {
	provider_service_form_attachments?: AttRow[] | null;
	consentForm?: { id: string; name: string; status: string } | null;
	intakeForm?: { id: string; name: string; status: string } | null;
};

export const PROVIDER_SERVICE_LIST_SELECT =
	'id, name, category, unit, price, currency, notes, is_active, sort_order, provider_service_form_attachments ( attachment_kind, forms ( id, name, status, form_type ) )';

export function decorateProviderServiceRows(data: unknown[]) {
	return ((data || []) as SvcOut[]).map((row) => {
		const atts = row.provider_service_form_attachments || [];
		let consentForm: { id: string; name: string; status: string } | null = null;
		let intakeForm: { id: string; name: string; status: string } | null = null;
		for (const a of atts) {
			const f = Array.isArray(a.forms) ? a.forms[0] : a.forms;
			if (!f) continue;
			const mini = { id: f.id, name: f.name, status: f.status };
			if (a.attachment_kind === 'consent') consentForm = mini;
			if (a.attachment_kind === 'intake') intakeForm = mini;
		}
		const out = { ...row, consentForm, intakeForm };
		delete out.provider_service_form_attachments;
		return out;
	});
}
