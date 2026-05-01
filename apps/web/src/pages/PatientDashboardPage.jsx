import React from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import HealthDashboardOverview from '@/components/HealthDashboardOverview.jsx';

export default function PatientDashboardPage() {
  const { currentUser } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Helmet><title>Dashboard - PayPill</title></Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {currentUser?.first_name || 'Patient'}</h1>
        <p className="text-muted-foreground mt-2 text-lg">Here is your health overview for today.</p>
      </div>

      <HealthDashboardOverview />
    </div>
  );
}