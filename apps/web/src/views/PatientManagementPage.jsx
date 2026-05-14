import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePatients } from '@/hooks/usePatients.js';
import PatientCard from '@/components/PatientCard.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function PatientManagementPage() {
	const { patients, loading } = usePatients();

	return (
		<div className="space-y-8 max-w-7xl mx-auto">
			<Helmet>
				<title>Patient Management - PayPill</title>
			</Helmet>
			<h1 className="text-3xl font-bold tracking-tight">Patient management</h1>

			<Card className="shadow-sm border-border/50">
				<CardHeader>
					<CardTitle>Your patients</CardTitle>
					<CardDescription className="text-base leading-relaxed max-w-3xl">
						Anyone on your care team roster, who has booked (past or present) with your linked practice, or has prescriptions, clinical notes,
						telemedicine, or consultation encounters tied to you or your organization. Status reflects upcoming visits, same-day visits, open
						documentation, or recent activity.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{loading ? (
							<LoadingSpinner className="col-span-full" />
						) : patients.length > 0 ? (
							patients.map((p) => <PatientCard key={p.id} patient={p} />)
						) : (
							<div className="col-span-full text-center p-12 border rounded-xl border-dashed text-muted-foreground max-w-xl mx-auto">
								<p className="font-medium text-foreground">No patients found for your practice yet.</p>
								<p className="mt-2 text-sm leading-relaxed">
									This list fills from bookings with your linked organization, your care-team assignments, prescriptions issued under your
									practice, and clinical or telemedicine activity you have documented. Confirm provider onboarding has linked the correct
									practice so bookings attach to your org.
								</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
