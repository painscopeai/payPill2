import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Activity, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

function formatWhen(iso) {
	if (!iso) return '—';
	const d = new Date(iso);
	return Number.isNaN(d.getTime())
		? String(iso)
		: d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function categoryLabel(cat) {
	if (cat === 'visits') return 'Visits';
	if (cat === 'health') return 'Health';
	if (cat === 'billing') return 'Invoices & pay';
	if (cat === 'claims') return 'Claims';
	return cat;
}

function categoryBadgeClass(cat) {
	if (cat === 'visits') return 'bg-sky-500/15 text-sky-900 dark:text-sky-100 border-sky-500/30';
	if (cat === 'health') return 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 border-emerald-500/30';
	if (cat === 'billing') return 'bg-amber-500/15 text-amber-950 dark:text-amber-100 border-amber-500/30';
	if (cat === 'claims') return 'bg-violet-500/15 text-violet-900 dark:text-violet-100 border-violet-500/30';
	return '';
}

const FILTERS = [
	{ id: 'all', label: 'All' },
	{ id: 'visits', label: 'Visits' },
	{ id: 'health', label: 'Health' },
	{ id: 'billing', label: 'Billing' },
	{ id: 'claims', label: 'Claims' },
];

export default function ProviderAnalyticsPage() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [eventFilter, setEventFilter] = useState('all');

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await apiServerClient.fetch('/provider/analytics/summary');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load analytics');
			setData(body);
		} catch (e) {
			setError(e.message || 'Failed to load');
			setData(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const filteredEvents = useMemo(() => {
		const ev = data?.events || [];
		if (eventFilter === 'all') return ev;
		return ev.filter((e) => e.category === eventFilter);
	}, [data, eventFilter]);

	const primaryKpis = useMemo(
		() => [
			{ label: 'Active patients', value: data?.activePatients ?? 0 },
			{ label: 'Appointments', value: data?.appointmentsTotal ?? 0 },
			{ label: 'Completed visits', value: data?.appointmentsCompleted ?? 0 },
			{ label: 'Revenue (invoiced paid)', value: `$${Number(data?.revenueInvoiced || 0).toFixed(2)}` },
			{ label: 'Revenue (payments)', value: `$${Number(data?.revenuePayments || 0).toFixed(2)}` },
		],
		[data],
	);

	const activity = data?.activity || {};

	const secondaryKpis = useMemo(
		() => [
			{ label: 'Draft invoices', value: activity.draftInvoices ?? 0 },
			{ label: 'Claim-ready lines', value: activity.claimReadyLines ?? 0 },
			{ label: 'Finalized consultations', value: activity.finalizedEncounters ?? 0 },
			{ label: 'Recent prescriptions', value: activity.prescriptionsRecent ?? 0 },
			{ label: 'Clinical notes (sample)', value: activity.clinicalNotesRecent ?? 0 },
		],
		[activity],
	);

	return (
		<div className="space-y-8 max-w-6xl">
			<Helmet>
				<title>Analytics - Provider - PayPill</title>
			</Helmet>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
					<p className="text-muted-foreground mt-1 max-w-2xl">
						Practice volume, revenue, and a live feed of visits, clinical work, billing, and claim-related events.
					</p>
				</div>
				<Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => void load()} disabled={loading}>
					<RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
					Refresh
				</Button>
			</div>

			{loading && !data ? (
				<LoadingSpinner />
			) : error ? (
				<p className="text-sm text-destructive">{error}</p>
			) : (
				<>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
						{primaryKpis.map((k) => (
							<Card key={k.label}>
								<CardHeader className="pb-2">
									<CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-2xl font-bold tabular-nums">{k.value}</p>
								</CardContent>
							</Card>
						))}
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
						{secondaryKpis.map((k) => (
							<Card key={k.label} className="border-dashed">
								<CardHeader className="pb-2">
									<CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-xl font-semibold tabular-nums">{k.value}</p>
								</CardContent>
							</Card>
						))}
					</div>

					<Card>
						<CardHeader className="space-y-1">
							<div className="flex flex-wrap items-center gap-2">
								<Activity className="h-5 w-5 text-muted-foreground" />
								<CardTitle className="text-lg">Recent activity</CardTitle>
							</div>
							<CardDescription>
								Newest first. Open a row to jump to the relevant area of the portal. Use filters to focus on visits,
								health documentation, billing, or claim lines.
							</CardDescription>
							<div className="flex flex-wrap gap-2 pt-2">
								{FILTERS.map((f) => (
									<Button
										key={f.id}
										type="button"
										size="sm"
										variant={eventFilter === f.id ? 'default' : 'outline'}
										className={eventFilter === f.id ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}
										onClick={() => setEventFilter(f.id)}
									>
										{f.label}
									</Button>
								))}
							</div>
						</CardHeader>
						<CardContent className="px-0 sm:px-6">
							{filteredEvents.length === 0 ? (
								<p className="text-sm text-muted-foreground px-6 py-4">No events in this view yet.</p>
							) : (
								<div className="overflow-x-auto rounded-lg border mx-4 sm:mx-0">
									<Table>
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												<TableHead scope="col" className="whitespace-nowrap w-[1%]">
													When
												</TableHead>
												<TableHead scope="col" className="whitespace-nowrap">
													Area
												</TableHead>
												<TableHead scope="col">Event</TableHead>
												<TableHead scope="col">Patient</TableHead>
												<TableHead scope="col" className="text-right whitespace-nowrap w-[1%]">
													Open
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredEvents.map((row) => (
												<TableRow key={row.id}>
													<TableCell className="whitespace-nowrap align-top text-muted-foreground text-sm tabular-nums">
														{formatWhen(row.occurred_at)}
													</TableCell>
													<TableCell className="align-top whitespace-nowrap">
														<Badge variant="outline" className={cn('font-normal border', categoryBadgeClass(row.category))}>
															{categoryLabel(row.category)}
														</Badge>
													</TableCell>
													<TableCell className="align-top min-w-[12rem] max-w-[28rem]">
														<div className="font-medium leading-snug">{row.title}</div>
														{row.subtitle ? (
															<p className="text-xs text-muted-foreground mt-1 line-clamp-2">{row.subtitle}</p>
														) : null}
													</TableCell>
													<TableCell className="align-top text-sm">{row.patient_display || '—'}</TableCell>
													<TableCell className="align-top text-right whitespace-nowrap">
														{row.href ? (
															<Button variant="link" className="h-auto p-0 text-teal-700 dark:text-teal-400" asChild>
																<Link to={row.href}>View</Link>
															</Button>
														) : (
															<span className="text-muted-foreground">—</span>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>

					<p className="text-xs text-muted-foreground">
						Quick links:{' '}
						<Link to="/provider/billing" className="underline-offset-2 hover:underline text-teal-700 dark:text-teal-400">
							Billing
						</Link>
						{' · '}
						<Link to="/provider/claims" className="underline-offset-2 hover:underline text-teal-700 dark:text-teal-400">
							Claims
						</Link>
						{' · '}
						<Link
							to="/provider/consultations"
							className="underline-offset-2 hover:underline text-teal-700 dark:text-teal-400"
						>
							Consultations
						</Link>
						{' · '}
						<Link to="/provider/patients" className="underline-offset-2 hover:underline text-teal-700 dark:text-teal-400">
							Patients
						</Link>
					</p>
				</>
			)}
		</div>
	);
}
