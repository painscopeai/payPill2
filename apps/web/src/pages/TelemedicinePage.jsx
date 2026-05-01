import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { useAppointments } from '@/hooks/useAppointments.js';
import AppointmentCard from '@/components/AppointmentCard.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TelemedicinePage() {
  const { appointments, loading } = useAppointments();
  const navigate = useNavigate();

  const teleAppointments = appointments.filter(a => a.type === 'telemedicine' && ['scheduled', 'in-progress'].includes(a.status));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Telemedicine - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Telemedicine</h1>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Upcoming Virtual Visits</h2>
          {loading ? <LoadingSpinner /> : teleAppointments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teleAppointments.map(apt => (
                <AppointmentCard 
                  key={apt.id} 
                  appointment={apt} 
                  actionLabel="Join Call"
                  actionIcon={Video}
                  onAction={(a) => navigate(`/telemedicine/${a.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center p-12 border rounded-xl border-dashed text-muted-foreground">
              No upcoming telemedicine appointments.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}