import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, AlertTriangle, CheckSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { usePatients } from '@/hooks/usePatients.js';
import { useNavigate } from 'react-router-dom';
import PatientCard from '@/components/PatientCard.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function ProviderDashboard() {
  const { currentUser } = useAuth();
  const { patients, loading } = usePatients();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Provider Dashboard - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Provider Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, Dr. {currentUser?.last_name || 'Provider'}</p>
          </div>
          <Button onClick={() => navigate('/provider/patients')}>View All Patients</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary"><Users className="h-6 w-6" /></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                <h3 className="text-2xl font-bold">{patients.length || 0}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-xl text-secondary"><Calendar className="h-6 w-6" /></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Appts</p>
                <h3 className="text-2xl font-bold">0</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-xl text-warning"><CheckSquare className="h-6 w-6" /></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Tasks</p>
                <h3 className="text-2xl font-bold">0</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-xl text-destructive"><AlertTriangle className="h-6 w-6" /></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Risk Alerts</p>
                <h3 className="text-2xl font-bold">0</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-border/50 h-full">
              <CardHeader className="pb-3 border-b">
                <CardTitle>Recent Patients</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {loading ? <LoadingSpinner /> : patients.length > 0 ? (
                    patients.map(p => <PatientCard key={p.id} patient={p} />)
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">No patients assigned yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" /> Action Required
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="text-sm text-muted-foreground text-center py-4">No urgent actions required.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}