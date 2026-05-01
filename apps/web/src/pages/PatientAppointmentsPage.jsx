import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Video, Plus, MoreVertical } from 'lucide-react';

export default function PatientAppointmentsPage() {
  const navigate = useNavigate();

  const upcoming = [
    { id: 1, provider: 'Dr. Sarah Jenkins', specialty: 'Cardiology', date: '2026-04-25', time: '10:30 AM', type: 'In-Person', location: '123 Medical Center Blvd', status: 'Confirmed' },
    { id: 2, provider: 'Dr. Michael Chen', specialty: 'Primary Care', date: '2026-05-12', time: '02:00 PM', type: 'Telehealth', location: 'Online Video Call', status: 'Pending' }
  ];

  const past = [
    { id: 3, provider: 'Dr. Emily Stone', specialty: 'Dermatology', date: '2026-01-15', time: '09:00 AM', type: 'In-Person', location: '456 Skin Clinic Ave', status: 'Completed' }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>My Appointments - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground">Manage your upcoming visits and view past history.</p>
          </div>
          <Button onClick={() => navigate('/patient/booking')} className="gap-2"><Plus className="h-4 w-4" /> Book New Appointment</Button>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past Visits</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcoming.map(apt => (
              <Card key={apt.id} className="shadow-sm border-border/50">
                <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="flex flex-col items-center justify-center bg-primary/5 rounded-xl p-4 min-w-[100px] border border-primary/10">
                    <span className="text-sm font-bold text-primary uppercase">{new Date(apt.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-3xl font-bold text-foreground">{new Date(apt.date).getDate()}</span>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">{apt.provider}</h3>
                      <Badge variant="outline" className={apt.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'}>
                        {apt.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{apt.specialty}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                      <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {apt.time}</div>
                      <div className="flex items-center gap-1">
                        {apt.type === 'Telehealth' ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />} 
                        {apt.location}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button variant="outline">Reschedule</Button>
                    {apt.type === 'Telehealth' ? (
                      <Button>Join Call</Button>
                    ) : (
                      <Button>Get Directions</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {past.map(apt => (
              <Card key={apt.id} className="shadow-sm border-border/50 opacity-80">
                <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="flex flex-col items-center justify-center bg-muted rounded-xl p-4 min-w-[100px]">
                    <span className="text-sm font-bold text-muted-foreground uppercase">{new Date(apt.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-3xl font-bold text-muted-foreground">{new Date(apt.date).getDate()}</span>
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <h3 className="text-lg font-bold text-muted-foreground">{apt.provider}</h3>
                    <p className="text-sm text-muted-foreground">{apt.specialty}</p>
                    <p className="text-sm text-muted-foreground pt-1">{apt.date} at {apt.time}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">View Notes</Button>
                    <Button variant="secondary" size="sm">Book Again</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}