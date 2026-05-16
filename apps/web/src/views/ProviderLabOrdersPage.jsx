import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { FlaskConical, ChevronRight } from 'lucide-react';
function formatDateShort(value) {
	if (!value) return '—';
	const d = /^\d{4}-\d{2}-\d{2}/.test(String(value))
		? new Date(`${value}T12:00:00`)
		: new Date(value);
	return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

export default function ProviderLabOrdersPage() {
	const [loading, setLoading] = useState(true);
	const [items, setItems] = useState([]);
	const [message, setMessage] = useState(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch('/provider/consultations');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load lab queue');
			setItems(Array.isArray(body.items) ? body.items : []);
			setMessage(body.message || null);
		} catch (e) {
			setItems([]);
			setMessage(e instanceof Error ? e.message : 'Failed to load');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<div className="space-y-6 max-w-4xl">
			<Helmet>
				<title>Lab orders — Provider</title>
			</Helmet>
			<div>
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
					<FlaskConical className="h-8 w-8 text-sky-600" />
					Lab order queue
				</h1>
				<p className="text-muted-foreground mt-1">
					Visits with specimen collection or result entry. Open an encounter to manage panels and finalize results.
				</p>
			</div>

			{message ? (
				<Card className="border-amber-500/30 bg-amber-500/5">
					<CardContent className="p-4 text-sm">{message}</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Scheduled visits</CardTitle>
					<CardDescription>Consultation and follow-up bookings for your laboratory</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					{loading ? (
						<div className="p-10 flex justify-center">
							<LoadingSpinner />
						</div>
					) : items.length === 0 ? (
						<p className="p-8 text-center text-muted-foreground text-sm">No visits in the lab queue yet.</p>
					) : (
						<ul className="divide-y">
							{items.map((row) => {
								const aptId = row.appointment_id || row.id;
								const patientName = row.patient_name || 'Patient';
								const status = row.encounter_status || row.status || 'scheduled';
								return (
									<li key={aptId} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
										<div className="flex-1 min-w-0">
											<p className="font-medium truncate">{patientName}</p>
											<p className="text-sm text-muted-foreground">
												{row.visit_label ? `${row.visit_label} · ` : ''}
												{formatDateShort(row.appointment_date)}
												{row.appointment_time ? ` · ${String(row.appointment_time).slice(0, 5)}` : ''}
											</p>
										</div>
										<Badge variant={status === 'finalized' ? 'secondary' : 'outline'} className="capitalize shrink-0">
											{String(status).replace(/_/g, ' ')}
										</Badge>
										<Button variant="outline" size="sm" asChild className="shrink-0">
											<Link to={`/provider/consultations?appointment=${aptId}`}>
												Open
												<ChevronRight className="h-4 w-4 ml-1" />
											</Link>
										</Button>
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
			</Card>

			<p className="text-xs text-muted-foreground">
				For full SOAP documentation and lab line entry, use the clinical consultation workspace when your organization also
				runs clinical visits—or open the patient chart from Patients.
			</p>
		</div>
	);
}
