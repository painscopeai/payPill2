import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight, Bell, FileText, MessageSquare } from 'lucide-react';
import pb from '@/lib/supabaseMappedCollections';
import { useAuth } from '@/contexts/AuthContext';

export default function CareNavigationPanel() {
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const records = await pb.collection('appointments').getList(1, 5, {
          filter: `userId="${currentUser.id}" && appointment_date >= "${today}"`,
          sort: 'appointment_date',
          $autoCancel: false
        });
        setAppointments(records.items);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchAppointments();
  }, [currentUser]);

  return (
    <Card className="shadow-lg h-full bg-gradient-to-b from-card to-muted/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Care Navigation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Action Items */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Action Items</h4>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-3">
              <FileText className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Complete Health Profile</p>
                <p className="text-xs text-muted-foreground mt-1">Missing family history details</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h4>
          {loading ? (
            <div className="h-16 bg-muted animate-pulse rounded-lg"></div>
          ) : appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map(apt => (
                <div key={apt.id} className="p-3 rounded-lg border bg-card flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-md text-center min-w-[50px]">
                    <p className="text-xs font-bold text-primary">{new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}</p>
                    <p className="text-lg font-bold text-primary leading-none">{new Date(apt.appointment_date).getDate()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{apt.provider_name || 'Doctor Appointment'}</p>
                    <p className="text-xs text-muted-foreground capitalize">{apt.appointment_type}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" className="justify-start w-full">
              <Calendar className="h-4 w-4 mr-2" /> Schedule Appointment
            </Button>
            <Button variant="outline" className="justify-start w-full">
              <MessageSquare className="h-4 w-4 mr-2" /> Message Provider
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}