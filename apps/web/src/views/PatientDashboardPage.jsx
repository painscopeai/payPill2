import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import HealthDashboardOverview from '@/components/HealthDashboardOverview.jsx';
import PatientBasicProfileSection from '@/components/PatientBasicProfileSection.jsx';

export default function PatientDashboardPage() {
  const { currentUser } = useAuth();
  const [profileSource, setProfileSource] = useState(null);
  const [activeInsurance, setActiveInsurance] = useState('');

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

  useEffect(() => {
    let cancelled = false;
    const loadInsurance = async () => {
      if (!currentUser?.id) {
        setActiveInsurance('');
        return;
      }
      const { data: rosterRow, error: rosterErr } = await supabase
        .from('employer_employees')
        .select('insurance_option_slug,updated_at')
        .eq('user_id', currentUser.id)
        .not('insurance_option_slug', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || rosterErr || !rosterRow?.insurance_option_slug) {
        if (!cancelled) setActiveInsurance('');
        return;
      }
      const insuranceId = String(rosterRow.insurance_option_slug);
      const { data: insuranceProfile } = await supabase
        .from('profiles')
        .select('company_name,name,email')
        .eq('id', insuranceId)
        .eq('role', 'insurance')
        .maybeSingle();
      if (cancelled) return;
      const label =
        insuranceProfile?.company_name ||
        insuranceProfile?.name ||
        insuranceProfile?.email ||
        insuranceId;
      setActiveInsurance(label);
    };
    void loadInsurance();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Helmet><title>Dashboard - PayPill</title></Helmet>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {currentUser?.first_name || 'Patient'}</h1>
        <p className="text-muted-foreground mt-2 text-lg">Here is your health overview for today.</p>
        {activeInsurance ? (
          <p className="text-sm text-muted-foreground mt-2">
            Active insurance: <span className="font-medium text-foreground">{activeInsurance}</span>
          </p>
        ) : null}
        {profileSource && (
          <p className="text-xs text-muted-foreground mt-2 font-mono">{profileSource}</p>
        )}
      </div>

      <PatientBasicProfileSection />

      <HealthDashboardOverview />
    </div>
  );
}
