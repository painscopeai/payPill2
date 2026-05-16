import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, FlaskConical, MessageSquare, Users, ClipboardList } from 'lucide-react';
import { usePatients } from '@/hooks/usePatients.js';
import { useNavigate } from 'react-router-dom';
import PatientCard from '@/components/PatientCard.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import apiServerClient from '@/lib/apiServerClient';
import { ProviderDashboardShell, ProviderKpiCard } from '@/components/provider/ProviderDashboardShell.jsx';
import { getProviderBranding } from '@/lib/providerPortalConfig.js';

export default function LaboratoryProviderDashboard() {
	const { patients, loading } = usePatients();
	const navigate = useNavigate();
	const [summary, setSummary] = useState(null);
	const brand = getProviderBranding('laboratory');
	const lab = summary?.laboratory || {};

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
		<>
			<Helmet>
				<title>Laboratory Dashboard - PayPill</title>
			</Helmet>
			<ProviderDashboardShell
				title="Laboratory dashboard"
				subtitle="Specimen orders, result entry, and panel coordination"
				accentButtonClass={brand.buttonClass}
				primaryAction={{ label: 'Lab order queue', onClick: () => navigate('/provider/lab-orders') }}
				kpis={[
					<ProviderKpiCard
						key="open"
						icon={FlaskConical}
						label="Open lab orders"
						value={lab.openLabOrders ?? 0}
						iconClassName={brand.accentClass}
						chipClassName={brand.chipClass}
					/>,
					<ProviderKpiCard
						key="draft"
						icon={ClipboardList}
						label="Draft encounters"
						value={lab.draftEncounters ?? 0}
						iconClassName="text-primary"
						chipClassName="bg-primary/10"
					/>,
					<ProviderKpiCard
						key="patients"
						icon={Users}
						label="Patients in roster"
						value={summary?.totalPatients ?? patients.length}
						iconClassName="text-emerald-600"
						chipClassName="bg-emerald-500/10"
					/>,
					<ProviderKpiCard
						key="appts"
						icon={Calendar}
						label="Today's collections"
						value={summary?.todayAppointments ?? 0}
						iconClassName="text-secondary"
						chipClassName="bg-secondary/10"
					/>,
				]}
				quickActions={[
					{ label: 'Lab order queue', onClick: () => navigate('/provider/lab-orders') },
					{ label: 'Lab test catalog', onClick: () => navigate('/provider/settings/catalog/labs') },
					{ label: 'Patient charts', onClick: () => navigate('/provider/patients') },
					{ label: 'Messages', onClick: () => navigate('/provider/messaging') },
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
										Patients with lab orders from your facility will appear in this roster.
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
								<FlaskConical className="h-4 w-4" />
								Lab workflow
							</CardTitle>
						</CardHeader>
						<CardContent className="p-4 text-sm text-muted-foreground space-y-2">
							<p>Process orders placed during clinical visits. Finalize encounters to release results to the patient chart.</p>
							<p className="text-xs">Maintain your lab catalog for standardized test names, codes, and list pricing.</p>
						</CardContent>
					</Card>
				}
			/>
		</>
	);
}
