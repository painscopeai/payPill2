import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

function sourceBadge(source) {
	if (source === 'consultation_complete') return 'Consultation';
	if (source === 'manual_catalog') return 'Catalog';
	if (source === 'manual_open') return 'Custom';
	return source || 'Billing';
}

export default function ProviderClaimsPage() {
	const [items, setItems] = useState([]);
	const [note, setNote] = useState('');
	const [loading, setLoading] = useState(true);

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

	return (
		<div className="space-y-6 max-w-5xl">
			<Helmet>
				<title>Claims - Provider - PayPill</title>
			</Helmet>
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Claims</h1>
				<p className="text-muted-foreground mt-1 leading-relaxed">
					{note || 'Draft charges from Billing that are ready for payer submission appear below.'}
				</p>
				<p className="text-sm text-muted-foreground mt-2">
					Manage invoices in{' '}
					<Link to="/provider/billing" className="text-teal-700 dark:text-teal-400 underline-offset-2 hover:underline">
						Billing
					</Link>
					.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Claim queue</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<LoadingSpinner />
					) : items.length === 0 ? (
						<p className="text-muted-foreground text-sm">No claim-ready charges yet.</p>
					) : (
						<div className="overflow-x-auto rounded-lg border">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/50 text-left">
										<th className="px-3 py-2 font-medium">Patient</th>
										<th className="px-3 py-2 font-medium">Service</th>
										<th className="px-3 py-2 font-medium">Source</th>
										<th className="px-3 py-2 font-medium">Claim status</th>
										<th className="px-3 py-2 font-medium text-right">Amount</th>
									</tr>
								</thead>
								<tbody>
									{items.map((row) => (
										<tr key={row.invoice_id} className="border-b last:border-0">
											<td className="px-3 py-2 align-top">{row.patient_display || '—'}</td>
											<td className="px-3 py-2 align-top max-w-[220px]">
												<span className="line-clamp-2">{row.service_label || row.description || '—'}</span>
											</td>
											<td className="px-3 py-2 align-top">
												<Badge variant="outline" className="font-normal">
													{sourceBadge(row.source)}
												</Badge>
											</td>
											<td className="px-3 py-2 align-top capitalize text-muted-foreground">
												{String(row.claim_status || '').replace(/_/g, ' ')}
											</td>
											<td className="px-3 py-2 align-top text-right tabular-nums whitespace-nowrap">
												${Number(row.amount || 0).toFixed(2)} {row.currency || 'USD'}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
