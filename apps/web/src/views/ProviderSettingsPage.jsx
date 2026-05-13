import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function ProviderSettingsPage() {
	const { currentUser } = useAuth();

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
						<span className="text-muted-foreground">Specialty:</span> {currentUser?.specialty || '—'}
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
		</div>
	);
}
