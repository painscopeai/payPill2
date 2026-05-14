import React from 'react';
import { Helmet } from 'react-helmet';
import { useAppointments } from '@/hooks/useAppointments.js';
import AppointmentCard from '@/components/AppointmentCard.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function ProviderAppointmentsPage() {
	const { appointments, loading } = useAppointments();

	const normalized = (appointments || []).map((apt) => ({
		...apt,
		type: apt.appointment_type || apt.type || 'consultation',
	}));

	return (
		<div className="space-y-8 max-w-7xl mx-auto">
			<Helmet>
				<title>Schedule - PayPill</title>
			</Helmet>
			<h1 className="text-3xl font-bold tracking-tight">Appointment schedule</h1>

			<div className="space-y-6">
				{loading ? (
					<LoadingSpinner />
				) : normalized.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{normalized.map((apt) => (
							<AppointmentCard
								key={apt.id}
								appointment={apt}
								patientProfileUserId={apt.user_id || apt.userId}
							/>
						))}
					</div>
				) : (
					<div className="text-center p-12 border rounded-xl border-dashed text-muted-foreground">
						No appointments scheduled for your linked practice.
					</div>
				)}
			</div>
		</div>
	);
}
