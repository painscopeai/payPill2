import React from 'react';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	FULFILLMENT_MODE_ASSIGNED,
	FULFILLMENT_MODE_PATIENT_CHOICE,
} from '@/lib/consultationFulfillment';

const PATIENT_CHOICE_VALUE = '__patient_choice__';

/**
 * Section-level pharmacy or laboratory routing for consultation encounters.
 */
export default function SectionFulfillmentSelect({
	label,
	value,
	onChange,
	partners,
	disabled,
}) {
	const selectValue =
		value.mode === FULFILLMENT_MODE_PATIENT_CHOICE
			? PATIENT_CHOICE_VALUE
			: value.fulfillment_org_id || '';

	const handleChange = (v) => {
		if (v === PATIENT_CHOICE_VALUE) {
			onChange({
				mode: FULFILLMENT_MODE_PATIENT_CHOICE,
				fulfillment_org_id: null,
				fulfillment_org_name: null,
			});
			return;
		}
		const partner = partners.find((p) => p.id === v);
		onChange({
			mode: FULFILLMENT_MODE_ASSIGNED,
			fulfillment_org_id: v,
			fulfillment_org_name: partner?.name || null,
		});
	};

	return (
		<div className="space-y-1.5 rounded-md border border-dashed border-border/80 bg-muted/20 p-3">
			<Label className="text-xs font-medium">{label}</Label>
			<Select value={selectValue || undefined} onValueChange={handleChange} disabled={disabled}>
				<SelectTrigger className="bg-background">
					<SelectValue placeholder="Select service provider…" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={PATIENT_CHOICE_VALUE}>Allow patient to choose</SelectItem>
					{partners.map((p) => (
						<SelectItem key={p.id} value={p.id}>
							{p.name}
							{p.address ? ` — ${p.address}` : ''}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<p className="text-xs text-muted-foreground">
				{value.mode === FULFILLMENT_MODE_PATIENT_CHOICE
					? 'The patient will pick a pharmacy or lab when booking.'
					: value.fulfillment_org_name
						? `Orders route to ${value.fulfillment_org_name}.`
						: 'Choose a provider or let the patient decide.'}
			</p>
		</div>
	);
}
