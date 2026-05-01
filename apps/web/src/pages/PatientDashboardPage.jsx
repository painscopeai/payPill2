import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabaseClient.js';
import HealthDashboardOverview from '@/components/HealthDashboardOverview.jsx';

export default function PatientDashboardPage() {
  const { currentUser } = useAuth();
  const [profileSource, setProfileSource] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!currentUser?.id) {
        setProfileSource(null);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('role, first_name')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn('[PatientDashboardPage] profiles read:', error.message);
        setProfileSource(null);
        return;
      }
      if (data) {
        setProfileSource(`Role: ${data.role} (loaded via RLS from Supabase)`);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Helmet><title>Dashboard - PayPill</title></Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {currentUser?.first_name || 'Patient'}</h1>
        <p className="text-muted-foreground mt-2 text-lg">Here is your health overview for today.</p>
        {profileSource && (
          <p className="text-xs text-muted-foreground mt-2 font-mono">{profileSource}</p>
        )}
      </div>

      <HealthDashboardOverview />
    </div>
  );
}
