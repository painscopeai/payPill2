import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePatients } from '@/hooks/usePatients.js';
import { useNavigate } from 'react-router-dom';
import PatientCard from '@/components/PatientCard.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import apiServerClient from '@/lib/apiServerClient';

export default function ProviderDashboard() {
	const { currentUser } = useAuth();
	const { patients, loading } = usePatients();
	const navigate = useNavigate();
	const [summary, setSummary] = useState(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await apiServerClient.fetch('/provider/dashboard/summary');
				const body = await res.json().catch(() => ({}));
				if (!cancelled && res.ok) setSummary(body);
			} catch {
				if (!cancelled) setSummary(null);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="space-y-8 max-w-7xl mx-auto">
			<Helmet>
				<title>Provider Dashboard - PayPill</title>
			</Helmet>
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Provider Dashboard</h1>
					<p className="text-muted-foreground mt-1">
						Welcome back{currentUser?.last_name ? `, Dr. ${currentUser.last_name}` : ''}
					</p>
				</div>
				<Button onClick={() => navigate('/provider/patients')} className="bg-teal-600 hover:bg-teal-700 text-white shrink-0">
					View all patients
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<Card className="shadow-sm border-border/50">
					<CardContent className="p-6 flex items-center gap-4">
						<div className="p-3 bg-teal-500/10 rounded-xl text-teal-600">
							<Users className="h-6 w-6" />
						</div>
						<div>
							<p className="text-sm font-medium text-muted-foreground">Total patients</p>
							<h3 className="text-2xl font-bold">{summary?.totalPatients ?? patients.length}</h3>
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-sm border-border/50">
					<CardContent className="p-6 flex items-center gap-4">
						<div className="p-3 bg-primary/10 rounded-xl text-primary">
							<Calendar className="h-6 w-6" />
						</div>
						<div>
							<p className="text-sm font-medium text-muted-foreground">Today&apos;s appointments</p>
							<h3 className="text-2xl font-bold">{summary?.todayAppointments ?? 0}</h3>
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-sm border-border/50">
					<CardContent className="p-6 flex items-center gap-4">
						<div className="p-3 bg-warning/10 rounded-xl text-warning">
							<CheckSquare className="h-6 w-6" />
						</div>
						<div>
							<p className="text-sm font-medium text-muted-foreground">Pending tasks</p>
							<h3 className="text-2xl font-bold">{summary?.pendingTasks ?? 0}</h3>
						</div>
					</CardContent>
				</Card>
				<Card className="shadow-sm border-border/50">
					<CardContent className="p-6 flex items-center gap-4">
						<div className="p-3 bg-secondary/10 rounded-xl text-secondary">
							<MessageSquare className="h-6 w-6" />
						</div>
						<div>
							<p className="text-sm font-medium text-muted-foreground">Unread messages</p>
							<h3 className="text-2xl font-bold">{summary?.unreadMessages ?? 0}</h3>
						</div>
					</CardContent>
				</Card>
			</div>

			{summary?.providerOrgLinked === false ? (
				<Card className="border-amber-500/40 bg-amber-500/5">
					<CardContent className="p-4 text-sm text-amber-950 dark:text-amber-100">
						Link your practice organization to see bookings in this dashboard. Complete{' '}
						<button type="button" className="underline font-semibold" onClick={() => navigate('/provider-onboarding/services')}>
							services onboarding
						</button>
						.
					</CardContent>
				</Card>
			) : null}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="lg:col-span-2 space-y-6">
					<Card className="shadow-sm border-border/50 h-full">
						<CardHeader className="pb-3 border-b">
							<CardTitle>Recent patients</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							<div className="divide-y">
								{loading ? (
									<div className="p-8 flex justify-center">
										<LoadingSpinner />
									</div>
								) : patients.length > 0 ? (
									patients.slice(0, 6).map((p) => <PatientCard key={p.id} patient={p} />)
								) : (
									<div className="p-8 text-center text-muted-foreground">
										No patients in your roster yet. Bookings and care activity will appear here once they exist.
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-6">
					<Card className="shadow-sm border-border/50">
						<CardHeader className="pb-3 border-b">
							<CardTitle className="text-lg">Quick actions</CardTitle>
						</CardHeader>
						<CardContent className="p-4 flex flex-col gap-2">
							<Button variant="outline" onClick={() => navigate('/provider/appointments')}>
								Schedule
							</Button>
							<Button variant="outline" onClick={() => navigate('/provider/messaging')}>
								Messages
							</Button>
							<Button variant="outline" onClick={() => navigate('/provider/billing')}>
								Billing
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
