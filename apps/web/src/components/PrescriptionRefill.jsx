import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Pill, RefreshCw, Clock, CheckCircle2, AlertCircle, Truck } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { usePrescriptions } from '@/hooks/usePrescriptions.js';

export default function PrescriptionRefill() {
  const { currentUser } = useAuth();
  const { prescriptions, loading, refetch } = usePrescriptions();
  const [refillingId, setRefillingId] = useState(null);

  const handleRefill = async (id) => {
    if (!currentUser?.id) return;
    
    setRefillingId(id);
    try {
      await pb.collection('refill_requests').create({
        user_id: currentUser.id,
        prescription_id: id,
        status: 'pending',
        requested_date: new Date().toISOString()
      }, { $autoCancel: false });
      
      toast.success('Refill requested successfully. You will receive a confirmation shortly.');
      
      // Update local data to reflect pending status without full refetch delay
      refetch();
    } catch (error) {
      console.error('Error requesting refill:', error);
      toast.error('Failed to request refill. Please try again.');
    } finally {
      setRefillingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border">
        <div>
          <h3 className="font-semibold">Auto-Refill Settings</h3>
          <p className="text-sm text-muted-foreground">Automatically request refills 5 days before running out.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="auto-refill" />
          <Label htmlFor="auto-refill">Enabled</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="h-32 bg-muted animate-pulse rounded-xl"></div>
        ) : prescriptions.length > 0 ? (
          prescriptions.map(med => {
            const hasRefills = med.refills_remaining > 0;
            
            return (
              <Card key={med.id} className="shadow-sm border-border/50 overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Pill className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">{med.medication_name}</h3>
                      </div>
                      {med.status === 'pending_refill' ? (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1">
                          <Clock className="h-3 w-3" /> Processing
                        </Badge>
                      ) : hasRefills ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Refill Available
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
                          <AlertCircle className="h-3 w-3" /> No Refills
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Dosage</p>
                        <p className="font-medium">{med.dosage || 'As directed'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Frequency</p>
                        <p className="font-medium">{med.frequency || 'Daily'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Refills Left</p>
                        <p className="font-medium">{med.refills_remaining || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</p>
                        <p className="font-medium capitalize">{med.status || 'Active'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-muted/20 p-6 border-t md:border-t-0 md:border-l flex flex-col justify-center items-center min-w-[200px] gap-3">
                    <Button 
                      className="w-full gap-2 transition-all" 
                      onClick={() => handleRefill(med.id)}
                      disabled={!hasRefills || med.status === 'pending_refill' || refillingId === med.id}
                    >
                      {refillingId === med.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Request Refill
                    </Button>
                    <Button variant="outline" className="w-full gap-2 text-xs h-8" disabled={!hasRefills}>
                      <Truck className="h-3 w-3" /> Switch to Delivery
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="text-center p-12 border rounded-xl border-dashed text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No active prescriptions found.</p>
          </div>
        )}
      </div>
    </div>
  );
}