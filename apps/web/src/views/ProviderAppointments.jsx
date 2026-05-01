import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Video, Clock, User, CheckCircle2 } from 'lucide-react';
import pb from '@/lib/supabaseMappedCollections';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ProviderAppointments() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const records = await pb.collection('appointments').getFullList({
          filter: `provider_id="${currentUser.id}"`,
          sort: 'appointment_time',
          $autoCancel: false
        });
        setAppointments(records);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchAppointments();
  }, [currentUser]);

  // Mock filtering for the selected date
  const todaysAppointments = appointments.length > 0 ? appointments : [
    { id: '1', patient_name: 'John Doe', appointment_time: '09:00 AM', type: 'telemedicine', status: 'scheduled' },
    { id: '2', patient_name: 'Sarah Smith', appointment_time: '10:30 AM', type: 'in-person', status: 'scheduled' },
    { id: '3', patient_name: 'Michael Johnson', appointment_time: '01:00 PM', type: 'telemedicine', status: 'scheduled' }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Schedule - PayPill Provider</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Appointment Schedule</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Calendar Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-sm border-border/50">
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md mx-auto"
                />
              </CardContent>
            </Card>
          </div>

          {/* Appointments List */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> 
              {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            
            {todaysAppointments.map(apt => (
              <Card key={apt.id} className="shadow-sm border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-muted p-3 rounded-lg text-center min-w-[80px]">
                      <div className="text-sm font-bold">{apt.appointment_time}</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        {apt.patient_name || 'Patient'}
                      </h4>
                      <p className="text-sm text-muted-foreground capitalize flex items-center gap-1 mt-1">
                        {apt.type === 'telemedicine' ? <Video className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                        {apt.type} Visit
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    {apt.type === 'telemedicine' && (
                      <Button onClick={() => navigate(`/telemedicine/${apt.id}`)} className="flex-1 sm:flex-none gap-2">
                        <Video className="h-4 w-4" /> Start Call
                      </Button>
                    )}
                    <Button variant="outline" className="flex-1 sm:flex-none gap-2" onClick={() => navigate(`/provider/patients/1`)}>
                      <User className="h-4 w-4" /> Chart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}