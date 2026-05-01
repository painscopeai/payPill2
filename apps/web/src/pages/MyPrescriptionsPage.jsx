import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pill, RefreshCw, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';

export default function MyPrescriptionsPage() {
  const { currentUser } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refillingId, setRefillingId] = useState(null);

  const fetchPrescriptions = async () => {
    if (!currentUser?.id) return;
    try {
      const data = await pb.collection('prescriptions').getList(1, 50, {
        filter: `user_id = "${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setPrescriptions(data.items);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [currentUser]);

  const handleRefill = async (id) => {
    setRefillingId(id);
    try {
      await pb.collection('refill_requests').create({
        user_id: currentUser.id,
        prescription_id: id,
        status: 'pending',
        requested_date: new Date().toISOString()
      }, { $autoCancel: false });
      
      toast.success('Refill requested successfully.');
      fetchPrescriptions();
    } catch (error) {
      toast.error('Failed to request refill.');
    } finally {
      setRefillingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>My Prescriptions - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold font-display tracking-tight">My Prescriptions</h1>
        </div>

        <div className="space-y-6">
          {loading ? (
            [1, 2].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-2xl"></div>)
          ) : prescriptions.length > 0 ? (
            prescriptions.map(med => {
              const hasRefills = med.refills_remaining > 0;
              const isActive = med.status === 'active';
              
              return (
                <Card key={med.id} className="shadow-lg border-none rounded-2xl overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-xl">
                            <Pill className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-xl font-display">{med.medication_name}</h3>
                            <p className="text-sm text-muted-foreground">{med.strength} • {med.route}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`
                          ${isActive ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}
                        `}>
                          {isActive ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                          {med.status || 'Active'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Dosage</p>
                          <p className="font-medium">{med.dosage || 'As directed'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Frequency</p>
                          <p className="font-medium">{med.frequency || 'Daily'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Refills Left</p>
                          <p className="font-medium">{med.refills_remaining || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Provider</p>
                          <p className="font-medium truncate">{med.prescribing_provider || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/30 p-6 border-t md:border-t-0 md:border-l flex flex-col justify-center items-center min-w-[240px] gap-3">
                      <Button 
                        className="w-full rounded-xl h-12 gap-2" 
                        onClick={() => handleRefill(med.id)}
                        disabled={!hasRefills || !isActive || refillingId === med.id}
                      >
                        {refillingId === med.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Request Refill
                      </Button>
                      {!hasRefills && isActive && (
                        <p className="text-xs text-muted-foreground text-center">Contact provider for new prescription</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <div className="text-center p-16 border rounded-2xl border-dashed text-muted-foreground bg-muted/10">
              <Pill className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-semibold mb-2">No Prescriptions Found</h3>
              <p>You don't have any active prescriptions on file.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}