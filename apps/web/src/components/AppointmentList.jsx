import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Clock, Video, FileText, XCircle, Download, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/supabaseMappedCollections';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AppointmentList() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);

  useEffect(() => {
    fetchAppointments();
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, [currentUser]);

  const fetchAppointments = async () => {
    try {
      const records = await pb.collection('appointments').getFullList({
        filter: `userId="${currentUser.id}"`,
        sort: '-appointment_date',
        $autoCancel: false
      });
      setAppointments(records);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedApt) return;
    try {
      await apiServerClient.fetch(`/appointments/${selectedApt.id}`, {
        method: 'DELETE'
      });
      toast.success('Appointment cancelled successfully');
      setAppointments(appointments.map(a => a.id === selectedApt.id ? { ...a, status: 'cancelled' } : a));
      setCancelModalOpen(false);
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'scheduled': return <span className="status-badge status-scheduled">Scheduled</span>;
      case 'in-progress': return <span className="status-badge status-in-progress">In Progress</span>;
      case 'completed': return <span className="status-badge status-completed">Completed</span>;
      case 'cancelled': return <span className="status-badge status-cancelled">Cancelled</span>;
      default: return <span className="status-badge bg-muted text-muted-foreground">{status}</span>;
    }
  };

  const renderCountdown = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    // Simple mock countdown logic for display
    const aptDate = new Date(`${dateStr.split('T')[0]}T${timeStr.replace(/ AM| PM/, ':00')}`);
    const diffMs = aptDate - now;
    
    if (diffMs < 0) return <span className="text-muted-foreground text-sm">Past</span>;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return <span className="countdown-timer text-primary">{days}d {hours}h</span>;
    if (hours > 0) return <span className="countdown-timer text-warning">{hours}h remaining</span>;
    return <span className="countdown-timer text-destructive animate-pulse">Starting soon!</span>;
  };

  const upcoming = appointments.filter(a => ['scheduled', 'in-progress'].includes(a.status));
  const past = appointments.filter(a => ['completed', 'cancelled', 'no-show'].includes(a.status));

  return (
    <div className="space-y-8">
      {/* Upcoming Appointments */}
      <section>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Upcoming Appointments
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="h-32 bg-muted animate-pulse rounded-xl col-span-full"></div>
          ) : upcoming.length > 0 ? (
            upcoming.map(apt => (
              <Card key={apt.id} className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{apt.provider_name || 'Provider'}</h4>
                      <p className="text-sm text-muted-foreground capitalize">{apt.appointment_type} Visit</p>
                    </div>
                    {getStatusBadge(apt.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(apt.appointment_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {apt.appointment_time}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm">
                      <span className="text-muted-foreground mr-2">Starts in:</span>
                      {renderCountdown(apt.appointment_date, apt.appointment_time)}
                    </div>
                    <div className="flex gap-2">
                      {apt.appointment_type === 'telemedicine' && (
                        <Button size="sm" onClick={() => navigate(`/telemedicine/${apt.id}`)} className="gap-1.5">
                          <Video className="h-4 w-4" /> Join Call
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setSelectedApt(apt); setCancelModalOpen(true); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full p-8 text-center border rounded-xl border-dashed text-muted-foreground">
              No upcoming appointments scheduled.
            </div>
          )}
        </div>
      </section>

      {/* Past Appointments */}
      <section>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" /> Past Appointments
        </h3>
        <div className="space-y-3">
          {past.map(apt => (
            <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-muted p-3 rounded-lg text-center min-w-[60px]">
                  <div className="text-xs font-medium text-muted-foreground uppercase">{new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}</div>
                  <div className="text-lg font-bold leading-none">{new Date(apt.appointment_date).getDate()}</div>
                </div>
                <div>
                  <h4 className="font-medium">{apt.provider_name || 'Provider'}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(apt.status)}
                    <span className="text-xs text-muted-foreground capitalize">{apt.appointment_type}</span>
                  </div>
                  {apt.notes && <p className="text-sm text-muted-foreground mt-2 line-clamp-1"><FileText className="h-3 w-3 inline mr-1" />{apt.notes}</p>}
                </div>
              </div>
              <div className="flex gap-2 sm:flex-col lg:flex-row">
                {apt.status === 'completed' && (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Summary</Button>
                    <Button variant="secondary" size="sm" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Feedback</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your appointment with {selectedApt?.provider_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>Keep Appointment</Button>
            <Button variant="destructive" onClick={handleCancel} className="gap-2">
              <XCircle className="h-4 w-4" /> Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}