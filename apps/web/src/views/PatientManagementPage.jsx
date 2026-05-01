import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePatients } from '@/hooks/usePatients.js';
import PatientCard from '@/components/PatientCard.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function PatientManagementPage() {
  const { patients, loading } = usePatients();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Patient Management - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Patient Management</h1>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>All Assigned Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? <LoadingSpinner className="col-span-full" /> : patients.length > 0 ? (
                patients.map(p => <PatientCard key={p.id} patient={p} />)
              ) : (
                <div className="col-span-full text-center p-12 border rounded-xl border-dashed text-muted-foreground">
                  No patients assigned.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}