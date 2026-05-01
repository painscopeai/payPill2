import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { useAppointments } from '@/hooks/useAppointments.js';
import AppointmentCard from '@/components/AppointmentCard.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function ProviderAppointmentsPage() {
  const { appointments, loading } = useAppointments();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Schedule - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Appointment Schedule</h1>

        <div className="space-y-6">
          {loading ? <LoadingSpinner /> : appointments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {appointments.map(apt => (
                <AppointmentCard key={apt.id} appointment={apt} />
              ))}
            </div>
          ) : (
            <div className="text-center p-12 border rounded-xl border-dashed text-muted-foreground">
              No appointments scheduled.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}