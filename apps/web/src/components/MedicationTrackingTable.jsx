import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Pill, RefreshCw, AlertTriangle } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function MedicationTrackingTable() {
  const { currentUser } = useAuth();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMedications();
  }, [currentUser]);

  const fetchMedications = async () => {
    try {
      const records = await pb.collection('current_medications').getList(1, 100, {
        filter: `userId="${currentUser.id}"`,
        $autoCancel: false
      });
      setMedications(records.items);
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefillRequest = async (med) => {
    try {
      await pb.collection('messages').create({
        userId: currentUser.id,
        sender_id: currentUser.id,
        sender_name: currentUser.first_name,
        sender_type: 'system',
        subject: `Refill Request: ${med.medication_name}`,
        content: `Patient requested refill for ${med.medication_name} ${med.dosage}.`,
        read_status: false
      }, { $autoCancel: false });
      toast.success(`Refill requested for ${med.medication_name}`);
    } catch (error) {
      toast.error('Failed to request refill');
    }
  };

  const filteredMeds = medications.filter(m => 
    m.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.medication_class?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              Active Prescriptions
            </CardTitle>
            <CardDescription>Manage your medications and refills</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search medications..."
              className="pl-8 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>)}
          </div>
        ) : filteredMeds.length > 0 ? (
          <div className="space-y-4">
            {filteredMeds.map(med => {
              // Mock refill logic for UI demonstration
              const daysRemaining = Math.floor(Math.random() * 40);
              const status = daysRemaining > 14 ? 'ok' : daysRemaining > 5 ? 'warning' : 'critical';
              
              return (
                <div key={med.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">{med.medication_name}</h4>
                      {status === 'critical' && <AlertTriangle className="h-4 w-4 text-error" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{med.dosage} • {med.frequency}</p>
                    <p className="text-xs text-muted-foreground mt-1">Provider: {med.prescribing_provider || 'Unknown'}</p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Days Left</p>
                      <Badge variant="outline" className={
                        status === 'ok' ? 'bg-success/10 text-success border-success/20' :
                        status === 'warning' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-error/10 text-error border-error/20'
                      }>
                        {daysRemaining}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-xs text-muted-foreground">Taken Today</p>
                      <Checkbox />
                    </div>

                    <Button 
                      size="sm" 
                      variant={status === 'critical' ? 'default' : 'outline'}
                      className="gap-2"
                      onClick={() => handleRefillRequest(med)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refill
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
            <Pill className="h-12 w-12 mb-2 opacity-20" />
            <p>No active medications found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}