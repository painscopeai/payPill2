import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/supabaseMappedCollections';
import { useAuth } from '@/contexts/AuthContext';

export function usePatients() {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const relationships = await pb.collection('patient_provider_relationships').getFullList({
        filter: `provider_id="${currentUser.id}"`,
        $autoCancel: false
      });
      
      // In a real app, we'd expand the user relation or fetch users by IDs
      // For MVP, we'll just return the relationships
      setPatients(relationships);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return { patients, loading, fetchPatients };
}