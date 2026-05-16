import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckSquare, MessageSquare, Users, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePatients } from '@/hooks/usePatients.js';
import { useNavigate } from 'react-router-dom';
import PatientCard from '@/components/PatientCard.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import apiServerClient from '@/lib/apiServerClient';
import { ProviderDashboardShell, ProviderKpiCard } from '@/components/provider/ProviderDashboardShell.jsx';
import { getProviderBranding } from '@/lib/providerPortalConfig.js';

export default function ClinicalProviderDashboard() {
	const { currentUser } = useAuth();
	const { patients, loading } = usePatients();
	const navigate = useNavigate();
	const [summary, setSummary] = useState(null);
	const brand = getProviderBranding('doctor');

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

	const welcome =
		currentUser?.last_name != null && String(currentUser.last_name).trim()
			? `Welcome back, Dr. ${currentUser.last_name}`
			: 'Welcome back';

	return (
		<>
			<Helmet>
				<title>Clinical Dashboard - PayPill</title>
			</Helmet>
			<ProviderDashboardShell
				title="Clinical dashboard"
				subtitle={welcome}
				accentButtonClass={brand.buttonClass}
				primaryAction={{ label: 'View all patients', onClick: () => navigate('/provider/patients') }}
				banner={
					summary?.providerOrgLinked === false ? (
						<Card className="border-amber-500/40 bg-amber-500/5">
							<CardContent className="p-4 text-sm text-amber-950 dark:text-amber-100">
								Link your practice organization to see bookings on this dashboard. Complete{' '}
								<button
									type="button"
									className="underline font-semibold"
									onClick={() => navigate('/provider/onboarding')}
								>
									practice onboarding
								</button>
								.
							</CardContent>
						</Card>
					) : null
				}
				kpis={[
					<ProviderKpiCard
						key="patients"
						icon={Users}
						label="Total patients"
						value={summary?.totalPatients ?? patients.length}
						iconClassName={brand.accentClass}
						chipClassName={brand.chipClass}
					/>,
					<ProviderKpiCard
						key="appts"
						icon={Calendar}
						label="Today's appointments"
						value={summary?.todayAppointments ?? 0}
						iconClassName="text-primary"
						chipClassName="bg-primary/10"
					/>,
					<ProviderKpiCard
						key="tasks"
						icon={CheckSquare}
						label="Pending tasks"
						value={summary?.pendingTasks ?? 0}
						iconClassName="text-amber-600"
						chipClassName="bg-amber-500/10"
					/>,
					<ProviderKpiCard
						key="msgs"
						icon={MessageSquare}
						label="Unread messages"
						value={summary?.unreadMessages ?? 0}
						iconClassName="text-secondary"
						chipClassName="bg-secondary/10"
					/>,
				]}
				quickActions={[
					{ label: 'Open consultations', onClick: () => navigate('/provider/consultations') },
					{ label: 'Schedule', onClick: () => navigate('/provider/appointments') },
					{ label: 'Messages', onClick: () => navigate('/provider/messaging') },
					{ label: 'Billing', onClick: () => navigate('/provider/billing') },
				]}
				mainPanel={
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
										No patients in your roster yet. Consultations and bookings will populate this list.
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				}
				sidePanel={
					<Card className="shadow-sm border-border/50">
						<CardHeader className="pb-3 border-b">
							<CardTitle className="text-lg flex items-center gap-2">
								<FileText className="h-4 w-4" />
								Clinical workflow
							</CardTitle>
						</CardHeader>
						<CardContent className="p-4 text-sm text-muted-foreground space-y-2">
							<p>Document visits with SOAP notes, e-prescribing, and lab orders from the consultation workspace.</p>
							<p className="text-xs">
								Finalized encounters sync action items to the patient chart and support claims-ready documentation.
							</p>
						</CardContent>
					</Card>
				}
			/>
		</>
	);
}
