import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MEDICATION_FREQUENCY_OPTIONS, frequencySelectValue } from '@/lib/prescriptionMedicationOptions';

/**
 * Frequency picker with standard medical options plus optional custom entry.
 */
export function MedicationFrequencySelect({ value, onChange, className, placeholder = 'Select frequency…' }) {
	const selectVal = frequencySelectValue(value);
	const isCustom = selectVal === '__custom__' || (selectVal && !MEDICATION_FREQUENCY_OPTIONS.some((o) => o.value === selectVal));

	return (
		<div className={className}>
			<Select
				value={isCustom ? '__custom__' : selectVal || ''}
				onValueChange={(v) => {
					if (v === '__custom__') {
						onChange(value || '');
						return;
					}
					onChange(v);
				}}
			>
				<SelectTrigger>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{MEDICATION_FREQUENCY_OPTIONS.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
					<SelectItem value="__custom__">Custom…</SelectItem>
				</SelectContent>
			</Select>
			{isCustom || selectVal === '__custom__' ? (
				<Input
					className="mt-1.5"
					placeholder="Enter custom frequency"
					value={value || ''}
					onChange={(e) => onChange(e.target.value)}
				/>
			) : null}
		</div>
	);
}
