import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, Clock, Video, User, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/supabaseMappedCollections';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AppointmentsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState({ upcoming: [], past: [], rescheduled: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  
  // Modals state
  const [cancelModal, setCancelModal] = useState({ open: false, appointment: null });
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, appointment: null });
  const [detailsModal, setDetailsModal] = useState({ open: false, appointment: null });

  // Reschedule form state
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      // Get all appointments and process client side for simplicity, 
      // or make specific PB queries based on active tab.
      // Doing single fetch here since lists are typically manageable for a single patient
      const records = await pb.collection('appointments').getFullList({
        filter: `userId="${currentUser.id}"`,
        sort: '-appointment_date',
        $autoCancel: false
      });

      const now = new Date().toISOString().split('T')[0];
      
      const upcoming = records.filter(r => r.appointment_date >= now && !['cancelled', 'completed'].includes(r.status));
      const past = records.filter(r => r.appointment_date < now || r.status === 'completed');
      const rescheduled = records.filter(r => r.notes?.includes('Rescheduled'));

      // Sort upcoming ascending (closest first)
      upcoming.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

      setAppointments({ upcoming, past, rescheduled });
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCancel = async () => {
    if (!cancelModal.appointment) return;
    setIsSubmitting(true);
    try {
      await pb.collection('appointments').update(cancelModal.appointment.id, {
        status: 'cancelled'
      }, { $autoCancel: false });
      
      toast.success('Appointment cancelled successfully');
      setCancelModal({ open: false, appointment: null });
      fetchAppointments();
    } catch (error) {
      toast.error('Could not cancel the appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleModal.appointment || !newDate || !newTime) return;
    setIsSubmitting(true);
    try {
      await pb.collection('appointments').update(rescheduleModal.appointment.id, {
        appointment_date: newDate,
        appointment_time: newTime,
        status: 'scheduled',
        notes: `Rescheduled from ${rescheduleModal.appointment.appointment_date}. ${rescheduleModal.appointment.notes || ''}`
      }, { $autoCancel: false });
      
      toast.success('Appointment rescheduled successfully');
      setRescheduleModal({ open: false, appointment: null });
      setNewDate('');
      setNewTime('');
      fetchAppointments();
    } catch (error) {
      toast.error('Could not reschedule the appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatStatus = (status) => {
    const map = {
      'scheduled': { color: 'bg-primary/10 text-primary', label: 'Scheduled' },
      'completed': { color: 'bg-success/10 text-success', label: 'Completed' },
      'cancelled': { color: 'bg-destructive/10 text-destructive', label: 'Cancelled' },
      'no-show': { color: 'bg-muted text-muted-foreground', label: 'No Show' }
    };
    return map[status] || { color: 'bg-secondary/10 text-secondary-foreground', label: status };
  };

  const EmptyState = ({ message, actionLabel, onAction }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl border-dashed bg-muted/20">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
        <CalendarIcon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{message}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">Keep track of your health journey by scheduling regular checkups.</p>
      {actionLabel && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>My Appointments - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground mt-1">Manage your upcoming visits and view history.</p>
          </div>
          <Button onClick={() => navigate('/dashboard')} className="rounded-full shadow-sm">
            Book New Appointment
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full sm:w-auto grid-cols-3 mb-8 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="upcoming" className="rounded-lg">Upcoming</TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg">Past</TabsTrigger>
            <TabsTrigger value="rescheduled" className="rounded-lg">Rescheduled</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-2xl"></div>)}
              </div>
            ) : appointments.upcoming.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.upcoming.map(apt => {
                  const statusStyle = formatStatus(apt.status);
                  return (
                    <Card key={apt.id} className="border-border/60 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-1.5 w-full bg-primary" />
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-semibold text-lg leading-tight">{apt.provider_name || 'Assigned Provider'}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <User className="h-3 w-3" /> General Practice
                            </p>
                          </div>
                          <Badge variant="outline" className={`${statusStyle.color} border-none`}>
                            {statusStyle.label}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-6 bg-muted/30 p-3 rounded-xl">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Date</p>
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                              {new Date(apt.appointment_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Time</p>
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              {apt.appointment_time || 'TBD'}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {apt.appointment_type === 'telemedicine' && (
                            <Button 
                              className="flex-1 gap-2" 
                              onClick={() => navigate(`/telemedicine/${apt.id}`)}
                            >
                              <Video className="h-4 w-4" /> Join Call
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => {
                              setNewDate(apt.appointment_date.split('T')[0]);
                              setNewTime(apt.appointment_time);
                              setRescheduleModal({ open: true, appointment: apt });
                            }}
                          >
                            Reschedule
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setCancelModal({ open: true, appointment: apt })}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No upcoming appointments" actionLabel="Book Appointment" onAction={() => navigate('/dashboard')} />
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl"></div>)}
              </div>
            ) : appointments.past.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {appointments.past.map(apt => {
                  const statusStyle = formatStatus(apt.status);
                  return (
                    <Card key={apt.id} className="border-border/60 shadow-sm rounded-2xl">
                      <CardContent className="p-5 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{apt.provider_name || 'Assigned Provider'}</h3>
                            <Badge variant="outline" className={`${statusStyle.color} border-none`}>{statusStyle.label}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5"><CalendarIcon className="h-4 w-4" /> {new Date(apt.appointment_date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {apt.appointment_time}</span>
                            <span className="flex items-center gap-1.5 capitalize"><Video className="h-4 w-4" /> {apt.appointment_type || 'in-person'}</span>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={() => setDetailsModal({ open: true, appointment: apt })}>
                            <FileText className="h-4 w-4 mr-2" /> View Details
                          </Button>
                          <Button onClick={() => navigate('/dashboard')}>Rebook</Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No past appointments history" />
            )}
          </TabsContent>

          <TabsContent value="rescheduled" className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl"></div>)}
              </div>
            ) : appointments.rescheduled.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {appointments.rescheduled.map(apt => (
                  <Card key={apt.id} className="border-border/60 shadow-sm rounded-2xl">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-warning/10 text-warning rounded-xl mt-1">
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{apt.provider_name}</h3>
                          <p className="text-sm text-foreground mt-1 bg-muted p-3 rounded-lg border">
                            {apt.notes}
                          </p>
                          <div className="text-sm text-muted-foreground mt-3 flex items-center gap-4">
                            <span>Current Schedule: <strong>{new Date(apt.appointment_date).toLocaleDateString()} at {apt.appointment_time}</strong></span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState message="No rescheduled appointments" />
            )}
          </TabsContent>
        </Tabs>

        {/* Reschedule Modal */}
        <Dialog open={rescheduleModal.open} onOpenChange={(open) => !open && setRescheduleModal({ open: false, appointment: null })}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Reschedule Appointment</DialogTitle>
              <DialogDescription>
                Select a new date and time for your appointment with {rescheduleModal.appointment?.provider_name}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleReschedule} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">New Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]} 
                  value={newDate} 
                  onChange={(e) => setNewDate(e.target.value)} 
                  required 
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">New Time</Label>
                <select 
                  id="time" 
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  required
                >
                  <option value="" disabled>Select a time</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                </select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setRescheduleModal({ open: false, appointment: null })} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Modal */}
        <Dialog open={cancelModal.open} onOpenChange={(open) => !open && setCancelModal({ open: false, appointment: null })}>
          <DialogContent className="sm:max-w-md rounded-2xl border-destructive/20">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> Cancel Appointment
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel your appointment with {cancelModal.appointment?.provider_name} on {cancelModal.appointment && new Date(cancelModal.appointment.appointment_date).toLocaleDateString()}? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCancelModal({ open: false, appointment: null })} disabled={isSubmitting}>
                Keep Appointment
              </Button>
              <Button type="button" variant="destructive" onClick={handleCancel} disabled={isSubmitting}>
                {isSubmitting ? 'Cancelling...' : 'Yes, Cancel it'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Modal */}
        <Dialog open={detailsModal.open} onOpenChange={(open) => !open && setDetailsModal({ open: false, appointment: null })}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
            </DialogHeader>
            {detailsModal.appointment && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Provider</span>
                    <p className="font-medium">{detailsModal.appointment.provider_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Type</span>
                    <p className="font-medium capitalize">{detailsModal.appointment.appointment_type || 'In-person'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Date & Time</span>
                    <p className="font-medium">{new Date(detailsModal.appointment.appointment_date).toLocaleDateString()} at {detailsModal.appointment.appointment_time}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Status</span>
                    <Badge variant="secondary" className="capitalize">{detailsModal.appointment.status}</Badge>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <span className="text-muted-foreground block mb-2 text-sm">Reason for visit</span>
                  <p className="text-sm bg-muted/50 p-3 rounded-xl border">{detailsModal.appointment.reason || 'Routine checkup and general consultation.'}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDetailsModal({ open: false, appointment: null })}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}