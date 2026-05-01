import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { usePrescriptions } from '@/hooks/usePrescriptions.js';
import PrescriptionCard from '@/components/PrescriptionCard.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function PrescriptionManagementPage() {
  const { prescriptions, loading } = usePrescriptions();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Prescriptions - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Prescription Management</h1>

        <div className="space-y-6">
          {loading ? <LoadingSpinner /> : prescriptions.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {prescriptions.map(rx => (
                <PrescriptionCard key={rx.id} prescription={rx} />
              ))}
            </div>
          ) : (
            <div className="text-center p-12 border rounded-xl border-dashed text-muted-foreground">
              No prescriptions found.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}