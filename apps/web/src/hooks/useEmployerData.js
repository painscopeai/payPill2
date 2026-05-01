import { useState, useCallback } from 'react';
import pb from '@/lib/supabaseMappedCollections';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useEmployerData = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [metrics, setMetrics] = useState([]);

  const fetchEmployees = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const records = await pb.collection('employer_employees').getFullList({
        filter: `employer_id="${currentUser.id}"`,
        expand: 'user_id',
        $autoCancel: false
      });
      setEmployees(records);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchMetrics = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const records = await pb.collection('employer_health_metrics').getFullList({
        filter: `employer_id="${currentUser.id}"`,
        $autoCancel: false
      });
      setMetrics(records);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  return { employees, metrics, loading, fetchEmployees, fetchMetrics };
};