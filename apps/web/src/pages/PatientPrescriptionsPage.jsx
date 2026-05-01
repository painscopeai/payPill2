import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Pill, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export default function PatientPrescriptionsPage() {
  const { currentUser } = useAuth();
  const [refillModalOpen, setRefillModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [loading, setLoading] = useState(false);

  const medications = [
    { id: 'rx1', name: 'Lisinopril', dosage: '10mg', frequency: '1 tablet daily', refills: 2, nextRefill: '2026-05-10', pharmacy: 'CVS Downtown' },
    { id: 'rx2', name: 'Atorvastatin', dosage: '20mg', frequency: '1 tablet at bedtime', refills: 0, nextRefill: 'Needs Refill', pharmacy: 'Walgreens Main St' }
  ];

  const handleRefillRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiServerClient.fetch('/prescriptions/refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'demo-user',
          prescriptionId: selectedMed.id,
          quantity: 30,
          pharmacy: selectedMed.pharmacy,
          deliveryMethod: 'pickup'
        })
      });

      if (!response.ok) throw new Error('Refill request failed');
      
      toast.success('Refill requested successfully!');
      setRefillModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to request refill.');
    } finally {
      setLoading(false);
    }
  };

  const openRefillModal = (med) => {
    setSelectedMed(med);
    setRefillModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>My Prescriptions - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Medications & Prescriptions</h1>
          <p className="text-muted-foreground">Manage your active prescriptions and request refills.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medications.map(med => (
            <Card key={med.id} className="shadow-sm border-border/50 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="bg-secondary/10 p-2 rounded-lg">
                    <Pill className="h-5 w-5 text-secondary" />
                  </div>
                  {med.refills === 0 ? (
                    <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">Refill Needed</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                  )}
                </div>
                <CardTitle className="text-xl mt-4">{med.name}</CardTitle>
                <p className="text-muted-foreground font-medium">{med.dosage}</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Directions</p>
                  <p className="text-sm font-medium">{med.frequency}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Refills Left</p>
                    <p className="font-semibold">{med.refills}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Next Refill</p>
                    <p className="font-semibold">{med.nextRefill}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button className="w-full gap-2" variant={med.refills === 0 ? 'default' : 'outline'} onClick={() => openRefillModal(med)}>
                  <RefreshCw className="h-4 w-4" /> Request Refill
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Dialog open={refillModalOpen} onOpenChange={setRefillModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Prescription Refill</DialogTitle>
            </DialogHeader>
            {selectedMed && (
              <form onSubmit={handleRefillRequest} className="space-y-4 py-4">
                <div className="bg-muted/30 p-4 rounded-lg border mb-4">
                  <h4 className="font-bold">{selectedMed.name} {selectedMed.dosage}</h4>
                  <p className="text-sm text-muted-foreground">{selectedMed.frequency}</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Pharmacy</Label>
                  <Input value={selectedMed.pharmacy} readOnly className="bg-muted" />
                </div>
                
                <div className="space-y-2">
                  <Label>Delivery Method</Label>
                  <Select defaultValue="pickup">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Pick up in store</SelectItem>
                      <SelectItem value="delivery">Home Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setRefillModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}