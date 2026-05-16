import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient';

export default function ProviderSettingsPage() {
	const { currentUser } = useAuth();
	const [practiceSpecialtyLabel, setPracticeSpecialtyLabel] = useState(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await apiServerClient.fetch('/provider/practice-context');
				const body = await res.json().catch(() => ({}));
				if (!cancelled && res.ok) {
					setPracticeSpecialtyLabel(body.provider_type_label || body.provider_type_slug || null);
				}
			} catch {
				if (!cancelled) setPracticeSpecialtyLabel(null);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="space-y-8 max-w-3xl">
			<Helmet>
				<title>Settings - Provider - PayPill</title>
			</Helmet>
			<h1 className="text-3xl font-bold tracking-tight">Practice settings</h1>

			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<p>
						<span className="text-muted-foreground">Email:</span> {currentUser?.email}
					</p>
					<p>
						<span className="text-muted-foreground">Practice specialty:</span>{' '}
						{practiceSpecialtyLabel || '—'}
					</p>
					<p>
						<span className="text-muted-foreground">NPI:</span> {currentUser?.npi || '—'}
					</p>
					<p>
						<span className="text-muted-foreground">Linked practice org:</span>{' '}
						{currentUser?.provider_org_id ? (
							<code className="text-xs rounded bg-muted px-1 py-0.5">{currentUser.provider_org_id}</code>
						) : (
							<span className="text-amber-700 dark:text-amber-300">Not linked</span>
						)}
					</p>
					<p className="pt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
						<Link to="/provider/onboarding?edit=1" className="text-teal-600 underline font-medium">
							Edit practice & availability
						</Link>
						<span className="hidden sm:inline text-muted-foreground">·</span>
						<Link to="/provider-onboarding/services" className="text-muted-foreground underline text-sm">
							Legacy application token intake
						</Link>
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Practice calendar</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<p className="text-muted-foreground">
						View open appointment slots from your linked practice hours. This used to live in the main sidebar; it is now here under settings.
					</p>
					<p>
						<Link to="/provider/settings/calendar" className="text-teal-600 font-medium underline">
							Open smart scheduling
						</Link>
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Clinical catalogs & services</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<p className="text-muted-foreground">
						Manage drug and lab pick-lists for consultations, and billable services. Add or edit rows manually on each page, or use JSON bulk import.
					</p>
					<ul className="list-disc pl-5 space-y-1.5">
						<li>
							<Link to="/provider/settings/catalog/drugs" className="text-teal-600 font-medium underline">
								Drug formulary
							</Link>{' '}
							— medications available when prescribing during a visit.
						</li>
						<li>
							<Link to="/provider/settings/catalog/labs" className="text-teal-600 font-medium underline">
								Lab catalog
							</Link>{' '}
							— tests you can order or reference.
						</li>
						<li>
							<Link to="/provider/settings/catalog/services" className="text-teal-600 font-medium underline">
								Services & pricing
							</Link>{' '}
							— billable visit types and fees.
						</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}
