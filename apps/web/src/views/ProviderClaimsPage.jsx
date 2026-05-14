import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

function sourceBadge(source) {
	if (source === 'consultation_complete') return 'Consultation';
	if (source === 'manual_catalog') return 'Catalog';
	if (source === 'manual_open') return 'Custom';
	return source || 'Billing';
}

function formatServiceDate(iso) {
	if (!iso || typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '—';
	const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
	return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function normalize(s) {
	return String(s || '')
		.trim()
		.toLowerCase();
}

function patientRowLabel(row) {
	const p = row.patient_details;
	const cov = row.coverage_summary;
	const n = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
	if (n) return n;
	if (cov?.full_name) return String(cov.full_name);
	return String(p?.email || row.patient_id || '').trim() || row.patient_id;
}

function matchesInsuranceSelection(row, insuranceValue) {
	if (!insuranceValue) return true;
	if (insuranceValue === '__UNSPECIFIED__') {
		return (row.insurance_group || '') === 'Unspecified payer';
	}
	const sel = normalize(insuranceValue);
	return normalize(row.insurance_group) === sel || normalize(row.insurance_plan_label || '') === sel;
}

export default function ProviderClaimsPage() {
	const [items, setItems] = useState([]);
	const [note, setNote] = useState('');
	const [loading, setLoading] = useState(true);
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [patientUserId, setPatientUserId] = useState('');
	const [insuranceValue, setInsuranceValue] = useState('');

	const [patients, setPatients] = useState([]);
	const [patientsLoading, setPatientsLoading] = useState(true);
	const [insuranceItems, setInsuranceItems] = useState([]);
	const [insuranceLoading, setInsuranceLoading] = useState(true);

	const [patientOpen, setPatientOpen] = useState(false);
	const [insuranceOpen, setInsuranceOpen] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const res = await apiServerClient.fetch('/provider/claims');
				const body = await res.json().catch(() => ({}));
				if (!cancelled && res.ok) {
					setItems(body.items || []);
					setNote(body.note || '');
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

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
			setInsuranceLoading(true);
			try {
				const res = await apiServerClient.fetch('/provider/insurance-directory');
				const body = await res.json().catch(() => ({}));
				if (!cancelled && res.ok) setInsuranceItems(Array.isArray(body.items) ? body.items : []);
			} finally {
				if (!cancelled) setInsuranceLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const insuranceComboChoices = useMemo(() => {
		const out = [{ value: '', label: 'All payers', subtitle: null }, ...insuranceItems];
		out.push({ value: '__UNSPECIFIED__', label: 'Unspecified payer', subtitle: 'No plan on file' });
		return out;
	}, [insuranceItems]);

	const patientDisplay = useMemo(() => {
		if (!patientUserId) return 'All patients';
		const row = patients.find((p) => p.patient_id === patientUserId);
		return row ? patientRowLabel(row) : 'Selected patient';
	}, [patientUserId, patients]);

	const insuranceDisplay = useMemo(() => {
		if (!insuranceValue) return 'All payers';
		const hit = insuranceComboChoices.find((i) => i.value === insuranceValue);
		return hit?.label || 'Selected payer';
	}, [insuranceValue, insuranceComboChoices]);

	const filteredItems = useMemo(() => {
		return items.filter((row) => {
			const sd = row.service_date || '';
			if (dateFrom && sd && sd < dateFrom) return false;
			if (dateTo && sd && sd > dateTo) return false;
			if (dateFrom && !sd) return false;
			if (dateTo && !sd) return false;
			if (patientUserId && row.patient_user_id !== patientUserId) return false;
			if (!matchesInsuranceSelection(row, insuranceValue)) return false;
			return true;
		});
	}, [items, dateFrom, dateTo, patientUserId, insuranceValue]);

	const groups = useMemo(() => {
		const map = new Map();
		for (const row of filteredItems) {
			const key = row.insurance_group || 'Unspecified payer';
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(row);
		}
		const list = [...map.entries()].map(([insurance_group, rows]) => {
			const sorted = [...rows].sort((a, b) => {
				const da = a.service_date || '';
				const db = b.service_date || '';
				if (da !== db) return db.localeCompare(da);
				return String(b.created_at || '').localeCompare(String(a.created_at || ''));
			});
			const total = sorted.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
			const currency = sorted[0]?.currency || 'USD';
			return { insurance_group, rows: sorted, total, currency };
		});
		list.sort((a, b) => a.insurance_group.localeCompare(b.insurance_group));
		return list;
	}, [filteredItems]);

	const clearFilters = () => {
		setDateFrom('');
		setDateTo('');
		setPatientUserId('');
		setInsuranceValue('');
	};

	const filtersActive = Boolean(dateFrom || dateTo || patientUserId || insuranceValue);

	return (
		<div className="space-y-6 max-w-7xl">
			<Helmet>
				<title>Claims - Provider - PayPill</title>
			</Helmet>
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Claims</h1>
				<p className="text-muted-foreground mt-1 leading-relaxed max-w-3xl">
					{note || 'Charges from Billing, grouped by the patient’s insurance on file.'}
				</p>
				<p className="text-sm text-muted-foreground mt-2">
					Manage line items in{' '}
					<Link to="/provider/billing" className="text-teal-700 dark:text-teal-400 underline-offset-2 hover:underline">
						Billing
					</Link>
					.
				</p>
			</div>

			<Card>
				<CardHeader className="space-y-4">
					<CardTitle>Filters</CardTitle>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<div className="space-y-2">
							<Label htmlFor="claims-date-from">From date</Label>
							<Input
								id="claims-date-from"
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
								aria-label="Filter claims from this service date"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="claims-date-to">To date</Label>
							<Input
								id="claims-date-to"
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
								aria-label="Filter claims through this service date"
							/>
						</div>
						<div className="space-y-2">
							<Label id="claims-patient-label">Patient</Label>
							<Popover open={patientOpen} onOpenChange={setPatientOpen}>
								<PopoverTrigger asChild>
									<Button
										type="button"
										variant="outline"
										aria-labelledby="claims-patient-label"
										aria-expanded={patientOpen}
										disabled={patientsLoading}
										className={cn('w-full justify-between font-normal', !patientUserId && 'text-muted-foreground')}
									>
										<span className="truncate text-left">{patientsLoading ? 'Loading patients…' : patientDisplay}</span>
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="min-w-[var(--radix-popover-trigger-width)] w-[min(100vw-2rem,24rem)] p-0" align="start">
									<Command>
										<CommandInput placeholder="Search patients…" />
										<CommandList>
											<CommandEmpty>No patient found.</CommandEmpty>
											<CommandGroup heading="Patients">
												<CommandItem
													value="all patients roster"
													onSelect={() => {
														setPatientUserId('');
														setPatientOpen(false);
													}}
												>
													All patients
												</CommandItem>
												{patients.map((row) => {
													const label = patientRowLabel(row);
													return (
														<CommandItem
															key={row.patient_id}
															value={`${label} ${row.patient_id}`}
															onSelect={() => {
																setPatientUserId(row.patient_id);
																setPatientOpen(false);
															}}
														>
															<span className="truncate">{label}</span>
														</CommandItem>
													);
												})}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</div>
						<div className="space-y-2">
							<Label id="claims-insurance-label">Insurance</Label>
							<Popover open={insuranceOpen} onOpenChange={setInsuranceOpen}>
								<PopoverTrigger asChild>
									<Button
										type="button"
										variant="outline"
										aria-labelledby="claims-insurance-label"
										aria-expanded={insuranceOpen}
										disabled={insuranceLoading}
										className={cn('w-full justify-between font-normal', !insuranceValue && 'text-muted-foreground')}
									>
										<span className="truncate text-left">
											{insuranceLoading ? 'Loading payers…' : insuranceDisplay}
										</span>
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="min-w-[var(--radix-popover-trigger-width)] w-[min(100vw-2rem,24rem)] p-0" align="start">
									<Command>
										<CommandInput placeholder="Search insurance…" />
										<CommandList>
											<CommandEmpty>No payer found.</CommandEmpty>
											<CommandGroup heading="Insurance">
												{insuranceComboChoices.map((opt) => (
													<CommandItem
														key={opt.value === '' ? '__all__' : opt.value}
														value={`${opt.label} ${opt.subtitle || ''} ${opt.value}`}
														onSelect={() => {
															setInsuranceValue(opt.value);
															setInsuranceOpen(false);
														}}
													>
														<div className="flex min-w-0 flex-col">
															<span className="truncate">{opt.label}</span>
															{opt.subtitle ? (
																<span className="truncate text-xs text-muted-foreground">{opt.subtitle}</span>
															) : null}
														</div>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</div>
					</div>
					{filtersActive ? (
						<Button type="button" variant="outline" size="sm" onClick={clearFilters}>
							Clear filters
						</Button>
					) : null}
				</CardHeader>
			</Card>

			<div className="space-y-4">
				<h2 className="text-lg font-semibold tracking-tight">By insurance</h2>
				{loading ? (
					<LoadingSpinner />
				) : items.length === 0 ? (
					<Card>
						<CardContent className="py-8">
							<p className="text-muted-foreground text-sm">No claim-ready charges yet.</p>
						</CardContent>
					</Card>
				) : groups.length === 0 ? (
					<Card>
						<CardContent className="py-8">
							<p className="text-muted-foreground text-sm">No rows match the current filters.</p>
							{filtersActive ? (
								<Button type="button" variant="link" className="px-0 mt-2 h-auto" onClick={clearFilters}>
									Clear filters
								</Button>
							) : null}
						</CardContent>
					</Card>
				) : (
					groups.map((g) => (
						<Collapsible key={g.insurance_group} defaultOpen className="rounded-xl border bg-card shadow-sm">
							<CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/40 rounded-t-xl [&[data-state=open]>svg]:rotate-180 transition-colors">
								<span className="min-w-0 flex-1">
									<span className="block truncate">{g.insurance_group}</span>
									<span className="block text-xs font-normal text-muted-foreground mt-0.5">
										{g.rows.length} line{g.rows.length === 1 ? '' : 's'} · Total{' '}
										<span className="tabular-nums font-medium text-foreground">
											${g.total.toFixed(2)} {g.currency}
										</span>
									</span>
								</span>
								<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" aria-hidden />
							</CollapsibleTrigger>
							<CollapsibleContent>
								<div className="border-t px-2 pb-3 pt-1">
									<div className="overflow-x-auto rounded-lg border">
										<Table>
											<TableCaption className="sr-only">
												Claim lines for insurance plan {g.insurance_group}: service date, patient, service
												name, source, and amount.
											</TableCaption>
											<TableHeader>
												<TableRow className="hover:bg-transparent">
													<TableHead scope="col" className="whitespace-nowrap">
														Service date
													</TableHead>
													<TableHead scope="col">Patient</TableHead>
													<TableHead scope="col" className="min-w-[10rem] max-w-[20rem]">
														Service
													</TableHead>
													<TableHead scope="col" className="whitespace-nowrap">
														Source
													</TableHead>
													<TableHead scope="col" className="text-right whitespace-nowrap">
														Amount
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{g.rows.map((row) => (
													<TableRow key={row.invoice_id}>
														<TableCell className="whitespace-nowrap tabular-nums">
															{formatServiceDate(row.service_date)}
														</TableCell>
														<TableCell>{row.patient_display || '—'}</TableCell>
														<TableCell className="max-w-[20rem]">
															<span className="line-clamp-2" title={row.service_name}>
																{row.service_name || '—'}
															</span>
														</TableCell>
														<TableCell>
															<Badge variant="outline" className="font-normal">
																{sourceBadge(row.source)}
															</Badge>
														</TableCell>
														<TableCell className="text-right tabular-nums whitespace-nowrap">
															${Number(row.amount || 0).toFixed(2)} {row.currency || 'USD'}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
											<TableFooter>
												<TableRow className="hover:bg-transparent">
													<TableCell colSpan={4} className="text-right font-semibold">
														Total for {g.insurance_group}
													</TableCell>
													<TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
														${g.total.toFixed(2)} {g.currency}
													</TableCell>
												</TableRow>
											</TableFooter>
										</Table>
									</div>
								</div>
							</CollapsibleContent>
						</Collapsible>
					))
				)}
			</div>
		</div>
	);
}
