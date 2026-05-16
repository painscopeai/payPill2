import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill, Package, Users, AlertTriangle } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { usePatients } from '@/hooks/usePatients.js';

export default function ProviderDispensingPage() {
	const navigate = useNavigate();
	const { patients, loading: patientsLoading } = usePatients();
	const [summary, setSummary] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await apiServerClient.fetch('/provider/dashboard/summary');
				const body = await res.json().catch(() => ({}));
				if (!cancelled && res.ok) setSummary(body);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const pharmacy = summary?.pharmacy || {};

	return (
		<div className="space-y-6 max-w-4xl">
			<Helmet>
				<title>Dispensing — Provider</title>
			</Helmet>
			<div>
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
					<Pill className="h-8 w-8 text-violet-600" />
					Dispensing
				</h1>
				<p className="text-muted-foreground mt-1">
					Fulfillment queue: verify stock, dispense to patients, and document handoffs.
				</p>
			</div>

			{loading ? (
				<div className="flex justify-center py-12">
					<LoadingSpinner />
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-3">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-base">Low stock</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-bold tabular-nums">{pharmacy.lowStockCount ?? 0}</p>
							<p className="text-xs text-muted-foreground mt-1">Items at or below threshold</p>
							{(pharmacy.lowStockCount ?? 0) > 0 ? (
								<p className="text-sm text-amber-700 dark:text-amber-300 mt-3 flex items-center gap-1">
									<AlertTriangle className="h-4 w-4" />
									Restock before dispensing high-volume items.
								</p>
							) : null}
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-base">Catalog</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-bold tabular-nums">{pharmacy.catalogItems ?? 0}</p>
							<p className="text-xs text-muted-foreground mt-1">Active SKUs on hand</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-base">Patients</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-bold tabular-nums">{summary?.totalPatients ?? patients.length}</p>
							<p className="text-xs text-muted-foreground mt-1">On your pharmacy roster</p>
						</CardContent>
					</Card>
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Dispensing workflow</CardTitle>
					<CardDescription>Standard pharmacy steps in PayPill</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col sm:flex-row flex-wrap gap-3">
					<Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => navigate('/provider/inventory')}>
						<Package className="h-4 w-4 mr-2" />
						Check inventory
					</Button>
					<Button variant="outline" onClick={() => navigate('/provider/patients')} disabled={patientsLoading}>
						<Users className="h-4 w-4 mr-2" />
						Patient charts
					</Button>
					<Button variant="outline" onClick={() => navigate('/provider/appointments')}>
						Today&apos;s visits
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Patients awaiting fulfillment</CardTitle>
					<CardDescription>Select a patient to review medications on file and message the care team</CardDescription>
				</CardHeader>
				<CardContent>
					{patientsLoading ? (
						<LoadingSpinner />
					) : patients.length === 0 ? (
						<p className="text-sm text-muted-foreground">No patients linked yet.</p>
					) : (
						<ul className="divide-y rounded-md border">
							{patients.slice(0, 12).map((p) => (
								<li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
									<span className="font-medium text-sm truncate">
										{p.first_name} {p.last_name}
									</span>
									<Button variant="ghost" size="sm" asChild>
										<Link to={`/provider/patients/${p.id}`}>Open chart</Link>
									</Button>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
