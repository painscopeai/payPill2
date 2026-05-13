import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
					<CardTitle>All assigned patients</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{loading ? (
							<LoadingSpinner className="col-span-full" />
						) : patients.length > 0 ? (
							patients.map((p) => <PatientCard key={p.id} patient={p} />)
						) : (
							<div className="col-span-full text-center p-12 border rounded-xl border-dashed text-muted-foreground">
								No patients assigned.
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
