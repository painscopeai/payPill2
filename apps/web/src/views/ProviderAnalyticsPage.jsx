import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function ProviderAnalyticsPage() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await apiServerClient.fetch('/provider/analytics/summary');
				const body = await res.json().catch(() => ({}));
				if (!cancelled && res.ok) setData(body);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="space-y-8 max-w-5xl">
			<Helmet>
				<title>Analytics - Provider - PayPill</title>
			</Helmet>
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
				<p className="text-muted-foreground mt-1">Practice volume and revenue signals.</p>
			</div>
			{loading ? (
				<LoadingSpinner />
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[
						{ label: 'Active patients', value: data?.activePatients ?? 0 },
						{ label: 'Appointments', value: data?.appointmentsTotal ?? 0 },
						{ label: 'Completed visits', value: data?.appointmentsCompleted ?? 0 },
						{ label: 'Revenue (invoiced paid)', value: `$${Number(data?.revenueInvoiced || 0).toFixed(2)}` },
						{ label: 'Revenue (payments)', value: `$${Number(data?.revenuePayments || 0).toFixed(2)}` },
					].map((k) => (
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
			)}
		</div>
	);
}
