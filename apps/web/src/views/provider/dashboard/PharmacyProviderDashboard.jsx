import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MessageSquare, Package, Pill, AlertTriangle } from 'lucide-react';
import { usePatients } from '@/hooks/usePatients.js';
import { useNavigate } from 'react-router-dom';
import PatientCard from '@/components/PatientCard.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import apiServerClient from '@/lib/apiServerClient';
import { ProviderDashboardShell, ProviderKpiCard } from '@/components/provider/ProviderDashboardShell.jsx';
import { getProviderBranding } from '@/lib/providerPortalConfig.js';
import { useProviderPracticeContext } from '@/hooks/useProviderPracticeContext';

export default function PharmacyProviderDashboard() {
	const { patients, loading } = usePatients();
	const navigate = useNavigate();
	const { practiceOrgName } = useProviderPracticeContext();
	const [summary, setSummary] = useState(null);
	const brand = getProviderBranding('pharmacist');
	const pharmacy = summary?.pharmacy || {};

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
				<title>Pharmacy Dashboard - PayPill</title>
			</Helmet>
			<ProviderDashboardShell
				title={practiceOrgName || 'Pharmacy dashboard'}
				subtitle="Inventory, dispensing, and patient pickup coordination"
				accentButtonClass={brand.buttonClass}
				primaryAction={{ label: 'Manage inventory', onClick: () => navigate('/provider/inventory') }}
				banner={
					(pharmacy.lowStockCount ?? 0) > 0 ? (
						<Card className="border-amber-500/40 bg-amber-500/5">
							<CardContent className="p-4 flex items-start gap-3 text-sm">
								<AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
								<div>
									<p className="font-medium text-amber-950 dark:text-amber-100">
										{pharmacy.lowStockCount} item{pharmacy.lowStockCount === 1 ? '' : 's'} below reorder threshold
									</p>
									<p className="text-muted-foreground mt-1">Review stock levels and record restock movements in inventory.</p>
								</div>
							</CardContent>
						</Card>
					) : null
				}
				kpis={[
					<ProviderKpiCard
						key="skus"
						icon={Package}
						label="Catalog items"
						value={pharmacy.catalogItems ?? 0}
						iconClassName={brand.accentClass}
						chipClassName={brand.chipClass}
					/>,
					<ProviderKpiCard
						key="low"
						icon={AlertTriangle}
						label="Low stock alerts"
						value={pharmacy.lowStockCount ?? 0}
						iconClassName="text-amber-600"
						chipClassName="bg-amber-500/10"
					/>,
					<ProviderKpiCard
						key="appts"
						icon={Calendar}
						label="Today's pickups / visits"
						value={summary?.todayAppointments ?? 0}
						iconClassName="text-primary"
						chipClassName="bg-primary/10"
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
					{ label: 'Inventory & stock moves', onClick: () => navigate('/provider/inventory') },
					{ label: 'Dispensing queue', onClick: () => navigate('/provider/dispensing') },
					{ label: 'Patient roster', onClick: () => navigate('/provider/patients') },
					{ label: 'Billing', onClick: () => navigate('/provider/billing') },
				]}
				mainPanel={
					<Card className="shadow-sm border-border/50 h-full">
						<CardHeader className="pb-3 border-b">
							<CardTitle>Patients served</CardTitle>
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
										Patients linked to your pharmacy will appear here for refill and pickup workflows.
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
								<Pill className="h-4 w-4" />
								Pharmacy operations
							</CardTitle>
						</CardHeader>
						<CardContent className="p-4 text-sm text-muted-foreground space-y-2">
							<p>Track on-hand quantity with stock additions, reductions, and adjustments. Use CSV import for bulk catalog updates.</p>
							<p className="text-xs">
								Clinical prescribing is handled by affiliated providers; your team focuses on fulfillment and inventory accuracy.
							</p>
						</CardContent>
					</Card>
				}
			/>
		</>
	);
}
