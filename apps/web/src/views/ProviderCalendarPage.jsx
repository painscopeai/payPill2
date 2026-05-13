import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function ProviderCalendarPage() {
	const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [duration, setDuration] = useState(30);
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const res = await apiServerClient.fetch(
					`/provider/calendar/smart?date=${encodeURIComponent(date)}&duration_minutes=${duration}`,
				);
				const body = await res.json().catch(() => ({}));
				if (!cancelled && res.ok) setData(body);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [date, duration]);

	return (
		<div className="space-y-8 max-w-4xl">
			<Helmet>
				<title>Calendar - Provider - PayPill</title>
			</Helmet>
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Smart scheduling</h1>
				<p className="text-muted-foreground mt-1">Open slots based on your linked practice calendar (9:00–17:00).</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Parameters</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-6 items-end">
					<div className="space-y-2">
						<Label htmlFor="cal-date">Date</Label>
						<Input id="cal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="cal-dur">Slot length (minutes)</Label>
						<Input
							id="cal-dur"
							type="number"
							min={15}
							step={15}
							value={duration}
							onChange={(e) => setDuration(Number(e.target.value) || 30)}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>
						Available slots {data?.booked_count != null ? `(${data.booked_count} booked)` : ''}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{data?.message ? <p className="text-sm text-muted-foreground mb-4">{data.message}</p> : null}
					{loading ? (
						<LoadingSpinner />
					) : (
						<div className="flex flex-wrap gap-2">
							{(data?.suggestions || []).map((s) => (
								<span
									key={s.time}
									className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-sm font-medium text-teal-800 dark:text-teal-200"
								>
									{s.time}
								</span>
							))}
							{!loading && (data?.suggestions || []).length === 0 ? (
								<p className="text-sm text-muted-foreground">No open slots for this day and duration.</p>
							) : null}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
