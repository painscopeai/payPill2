import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

function patientRowLabel(row) {
	const p = row.patient_details;
	const cov = row.coverage_summary;
	const n = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
	if (n) return n;
	if (cov?.full_name) return String(cov.full_name);
	return String(p?.email || row.patient_id || '').trim() || row.patient_id;
}

export default function ProviderBillingPage() {
	const [invoices, setInvoices] = useState([]);
	const [patients, setPatients] = useState([]);
	const [services, setServices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [patientsLoading, setPatientsLoading] = useState(true);
	const [servicesLoading, setServicesLoading] = useState(true);
	const [lineMode, setLineMode] = useState('catalog');
	const [patientId, setPatientId] = useState('');
	const [serviceId, setServiceId] = useState('');
	const [customAmount, setCustomAmount] = useState('');
	const [customDescription, setCustomDescription] = useState('');
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState('');

	const activeServices = useMemo(
		() => (services || []).filter((s) => s.is_active !== false),
		[services],
	);

	const catalogDisabled = !activeServices.length || servicesLoading;

	useEffect(() => {
		if (lineMode === 'catalog' && catalogDisabled) setLineMode('open');
	}, [lineMode, catalogDisabled]);

	const loadInvoices = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch('/provider/billing/invoices');
			const body = await res.json().catch(() => ({}));
			if (res.ok) setInvoices(body.items || []);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadInvoices();
	}, [loadInvoices]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setPatientsLoading(true);
			try {
				const res = await apiServerClient.fetch('/provider/patients');
				const body = await res.json().catch(() => ({}));
				if (!cancelled && res.ok && Array.isArray(body)) setPatients(body);
			} finally {
				if (!cancelled) setPatientsLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setServicesLoading(true);
			try {
				const res = await apiServerClient.fetch('/provider/catalog/services');
				const body = await res.json().catch(() => ({}));
				if (!cancelled && res.ok) setServices(body.items || []);
			} finally {
				if (!cancelled) setServicesLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const createInvoice = async (e) => {
		e.preventDefault();
		setFormError('');
		if (!patientId) {
			setFormError('Select a patient.');
			return;
		}
		setSaving(true);
		try {
			const payload =
				lineMode === 'catalog'
					? {
							patient_user_id: patientId,
							mode: 'catalog',
							provider_service_id: serviceId,
							status: 'draft',
						}
					: {
							patient_user_id: patientId,
							mode: 'open',
							amount: Number(customAmount) || 0,
							description: customDescription || 'Service',
							status: 'draft',
						};
			const res = await apiServerClient.fetch('/provider/billing/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				setFormError(body.error || 'Could not create invoice.');
				return;
			}
			setCustomAmount('');
			setCustomDescription('');
			setServiceId('');
			await loadInvoices();
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-8 max-w-5xl">
			<Helmet>
				<title>Billing - Provider - PayPill</title>
			</Helmet>
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Billing</h1>
				<p className="text-muted-foreground mt-1">
					Invoices for patients. Completing a consultation creates a charge automatically. Eligible lines
					also appear on the{' '}
					<Link to="/provider/claims" className="text-teal-700 dark:text-teal-400 underline-offset-2 hover:underline">
						Claims
					</Link>{' '}
					page for insurance filing.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>New invoice</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={createInvoice} className="space-y-6">
						<div className="space-y-2">
							<Label>Patient</Label>
							{patientsLoading ? (
								<p className="text-sm text-muted-foreground">Loading patients…</p>
							) : (
								<Select value={patientId} onValueChange={setPatientId}>
									<SelectTrigger className="max-w-xl">
										<SelectValue placeholder="Choose a patient" />
									</SelectTrigger>
									<SelectContent>
										{patients.map((row) => (
											<SelectItem key={row.patient_id} value={row.patient_id}>
												{patientRowLabel(row)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</div>

						<div className="space-y-3">
							<Label>Line item</Label>
							<RadioGroup
								value={lineMode}
								onValueChange={(v) => {
									setLineMode(v);
									setFormError('');
								}}
								className="grid gap-3 sm:grid-cols-2 max-w-2xl"
							>
								<label
									htmlFor="mode-catalog"
									className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
										lineMode === 'catalog' ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/20' : 'border-border'
									} ${catalogDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
								>
									<RadioGroupItem value="catalog" id="mode-catalog" disabled={catalogDisabled} className="mt-0.5" />
									<span className="space-y-0.5">
										<span className="block text-sm font-medium">Services</span>
										<span className="block text-xs text-muted-foreground leading-snug">
											Choose from the list of services.
										</span>
									</span>
								</label>
								<label
									htmlFor="mode-open"
									className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
										lineMode === 'open' ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/20' : 'border-border'
									}`}
								>
									<RadioGroupItem value="open" id="mode-open" className="mt-0.5" />
									<span className="space-y-0.5">
										<span className="block text-sm font-medium">Open Services</span>
										<span className="block text-xs text-muted-foreground leading-snug">
											Enter a custom description and amount for this line.
										</span>
									</span>
								</label>
							</RadioGroup>
							{catalogDisabled && lineMode === 'catalog' ? (
								<p className="text-sm text-amber-800 dark:text-amber-200/90">
									Add services under Catalog (or onboarding) to use catalog billing. You can still use a custom line
									item.
								</p>
							) : null}
						</div>

						{lineMode === 'catalog' ? (
							<div className="space-y-2 max-w-xl">
								<Label>Service</Label>
								<Select value={serviceId} onValueChange={setServiceId} disabled={catalogDisabled}>
									<SelectTrigger>
										<SelectValue placeholder="Select a priced service" />
									</SelectTrigger>
									<SelectContent>
										{activeServices.map((s) => (
											<SelectItem key={s.id} value={s.id}>
												{s.name} — ${Number(s.price || 0).toFixed(2)} {s.currency || 'USD'}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						) : (
							<div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
								<div className="space-y-2">
									<Label htmlFor="inv-amt">Amount (USD)</Label>
									<Input
										id="inv-amt"
										type="number"
										step="0.01"
										min="0.01"
										value={customAmount}
										onChange={(e) => setCustomAmount(e.target.value)}
										required
									/>
								</div>
								<div className="space-y-2 sm:col-span-2">
									<Label htmlFor="inv-desc">Description</Label>
									<Input
										id="inv-desc"
										value={customDescription}
										onChange={(e) => setCustomDescription(e.target.value)}
										placeholder="e.g. Phone follow-up, supply fee"
										required
									/>
								</div>
							</div>
						)}

						{formError ? <p className="text-sm text-destructive">{formError}</p> : null}

						<Button
							type="submit"
							disabled={
								saving ||
								!patientId ||
								(lineMode === 'catalog' && (!serviceId || catalogDisabled)) ||
								(lineMode === 'open' && (!customAmount || !customDescription.trim()))
							}
							className="bg-teal-600 hover:bg-teal-700 text-white"
						>
							{saving ? 'Saving…' : 'Create invoice'}
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Recent invoices</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<LoadingSpinner />
					) : invoices.length === 0 ? (
						<p className="text-muted-foreground text-sm">No invoices yet.</p>
					) : (
						<ul className="divide-y rounded-lg border">
							{invoices.map((inv) => (
								<li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
									<div className="min-w-0 flex-1 space-y-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-medium truncate">{inv.description || 'Invoice'}</span>
											{inv.source_label ? (
												<Badge variant="secondary" className="shrink-0 text-xs font-normal">
													{inv.source_label}
												</Badge>
											) : null}
										</div>
										{inv.patient_display ? (
											<p className="text-xs text-muted-foreground truncate">Patient: {inv.patient_display}</p>
										) : null}
										{inv.consultation_summary ? (
											<p className="text-xs mt-1">
												{inv.appointment_id ? (
													<Link
														to={`/provider/consultations?appointment=${encodeURIComponent(String(inv.appointment_id))}`}
														className="text-teal-700 dark:text-teal-400 underline-offset-2 hover:underline"
													>
														{inv.consultation_summary}
													</Link>
												) : (
													<span className="text-muted-foreground">{inv.consultation_summary}</span>
												)}
											</p>
										) : null}
									</div>
									<span className="tabular-nums shrink-0 font-medium">${Number(inv.amount || 0).toFixed(2)}</span>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
