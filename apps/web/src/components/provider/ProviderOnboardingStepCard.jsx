import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { humanizeFieldKey, humanizeSlug, ONBOARDING_FIELD_LABELS } from '@/lib/providerPatientChartFormat';
import { stepValidation } from '@/server/express-api/utils/validation.js';

function formatScalar(value) {
	if (value === null || value === undefined || value === '') return '—';
	if (typeof value === 'boolean') return value ? 'Yes' : 'No';
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	if (typeof value === 'string') {
		const t = value.trim();
		if (t === 'true') return 'Yes';
		if (t === 'false') return 'No';
		if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
			const d = new Date(t);
			if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
		}
		if (t.includes('-') && t === t.toLowerCase() && !t.includes('@') && !/\s/.test(t)) return humanizeSlug(t);
		if (/^[a-z][a-z0-9_-]*$/i.test(t) && t.length <= 48 && !t.includes('@') && !t.includes('.')) {
			return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
		}
		return t;
	}
	return String(value);
}

/**
 * @param {{ step: number, data?: object, updatedLabel?: string }} props
 */
export default function ProviderOnboardingStepCard({ step, data, updatedLabel }) {
	const raw = data && typeof data === 'object' ? data : {};
	const title = stepValidation[step]?.name || `Questionnaire · Step ${step}`;

	const rows = useMemo(() => {
		const keys = Object.keys(raw).filter((k) => !k.startsWith('_'));
		return keys.map((key) => ({ key, label: ONBOARDING_FIELD_LABELS[key] || humanizeFieldKey(key), value: raw[key] }));
	}, [raw]);

	return (
		<Card className="overflow-hidden border-border/80 shadow-sm">
			<CardHeader className="bg-muted/40 border-b border-border/60 py-4">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Step {step}</p>
						<CardTitle className="text-lg font-semibold tracking-tight mt-0.5">{title}</CardTitle>
					</div>
					{updatedLabel ? (
						<CardDescription className="text-xs sm:text-right max-w-[14rem]">{updatedLabel}</CardDescription>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="pt-4 pb-5">
				{rows.length === 0 ? (
					<p className="text-sm text-muted-foreground">No responses saved for this step.</p>
				) : (
					<dl className="grid gap-4 sm:grid-cols-2">
						{rows.map(({ key, label, value }) => (
							<div key={key} className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-[minmax(10rem,14rem)_1fr] gap-x-4 gap-y-1 border-b border-border/50 pb-3 last:border-0 last:pb-0">
								<dt className="text-sm font-medium text-muted-foreground">{label}</dt>
								<dd className="text-sm text-foreground min-w-0">
									<FieldValue value={value} fieldKey={key} />
								</dd>
							</div>
						))}
					</dl>
				)}
			</CardContent>
		</Card>
	);
}

/** @param {{ value: unknown, fieldKey: string }} props */
function FieldValue({ value, fieldKey }) {
	if (value === null || value === undefined || value === '') {
		return <span className="text-muted-foreground">—</span>;
	}

	if (typeof value === 'boolean') {
		return <span>{value ? 'Yes' : 'No'}</span>;
	}

	if (Array.isArray(value)) {
		if (value.length === 0) return <span className="text-muted-foreground">None listed</span>;
		if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
			return (
				<div className="flex flex-wrap gap-1.5">
					{value.map((v, i) => (
						<Badge key={`${fieldKey}-${i}`} variant="secondary" className="font-normal">
							{typeof v === 'string' && v.includes('-') && v === v.toLowerCase() ? humanizeSlug(v) : formatScalar(v)}
						</Badge>
					))}
				</div>
			);
		}
		return (
			<ul className="space-y-2">
				{value.map((item, i) => (
					<li key={i} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
						{typeof item === 'object' && item !== null ? <ObjectSummary obj={item} /> : formatScalar(item)}
					</li>
				))}
			</ul>
		);
	}

	if (typeof value === 'object' && !Array.isArray(value)) {
		const entries = Object.entries(value);
		if (entries.length === 0) return <span className="text-muted-foreground">—</span>;

		if (fieldKey === 'conditions_by_category') {
			return (
				<div className="space-y-3">
					{entries.map(([cat, slugs]) => (
						<div key={cat} className="rounded-lg border border-border/60 bg-card/50 p-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
								{humanizeFieldKey(cat)}
							</p>
							{Array.isArray(slugs) && slugs.length ? (
								<div className="flex flex-wrap gap-1.5">
									{slugs.map((s) => (
										<Badge key={String(s)} variant="outline" className="font-normal">
											{humanizeSlug(String(s))}
										</Badge>
									))}
								</div>
							) : (
								<span className="text-xs text-muted-foreground">None selected</span>
							)}
						</div>
					))}
				</div>
			);
		}

		if (fieldKey === 'lifestyle' || fieldKey === 'insurance') {
			return <ObjectSummary obj={value} />;
		}

		return <ObjectSummary obj={value} />;
	}

	return <span>{formatScalar(value)}</span>;
}

/** @param {{ obj: Record<string, unknown> }} props */
function ObjectSummary({ obj }) {
	const entries = Object.entries(obj).filter(([k]) => !k.startsWith('_'));
	if (!entries.length) return <span className="text-muted-foreground">—</span>;
	return (
		<dl className="grid gap-2 sm:grid-cols-2">
			{entries.map(([k, v]) => (
				<div key={k} className="sm:col-span-2 grid sm:grid-cols-[10rem_1fr] gap-x-2 text-xs sm:text-sm">
					<dt className="text-muted-foreground">{humanizeFieldKey(k)}</dt>
					<dd className="min-w-0">
						{v !== null && typeof v === 'object' ? (
							<pre className="text-xs overflow-x-auto rounded bg-muted/50 p-2 border max-h-40">
								{JSON.stringify(v, null, 2)}
							</pre>
						) : (
							formatScalar(v)
						)}
					</dd>
				</div>
			))}
		</dl>
	);
}
