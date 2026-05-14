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
import { ChevronDown } from 'lucide-react';
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

export default function ProviderClaimsPage() {
	const [items, setItems] = useState([]);
	const [note, setNote] = useState('');
	const [loading, setLoading] = useState(true);
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [patientQuery, setPatientQuery] = useState('');
	const [insuranceQuery, setInsuranceQuery] = useState('');

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

	const filteredItems = useMemo(() => {
		const pq = normalize(patientQuery);
		const iq = normalize(insuranceQuery);
		return items.filter((row) => {
			const sd = row.service_date || '';
			if (dateFrom && sd && sd < dateFrom) return false;
			if (dateTo && sd && sd > dateTo) return false;
			if (dateFrom && !sd) return false;
			if (dateTo && !sd) return false;
			if (pq && !normalize(row.patient_display).includes(pq)) return false;
			if (iq) {
				const g = normalize(row.insurance_group);
				const p = normalize(row.insurance_plan_label);
				if (!g.includes(iq) && !p.includes(iq)) return false;
			}
			return true;
		});
	}, [items, dateFrom, dateTo, patientQuery, insuranceQuery]);

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
		setPatientQuery('');
		setInsuranceQuery('');
	};

	const filtersActive = Boolean(dateFrom || dateTo || patientQuery.trim() || insuranceQuery.trim());

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
							<Label htmlFor="claims-patient">Patient</Label>
							<Input
								id="claims-patient"
								type="search"
								placeholder="Name contains…"
								value={patientQuery}
								onChange={(e) => setPatientQuery(e.target.value)}
								autoComplete="off"
								aria-label="Filter by patient name"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="claims-insurance">Insurance</Label>
							<Input
								id="claims-insurance"
								type="search"
								placeholder="Plan or payer contains…"
								value={insuranceQuery}
								onChange={(e) => setInsuranceQuery(e.target.value)}
								autoComplete="off"
								aria-label="Filter by insurance plan or payer"
							/>
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
