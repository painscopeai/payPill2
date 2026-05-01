import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext';

export function usePrescriptions() {
  const { currentUser } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPrescriptions = useCallback(async () => {
    const userId = currentUser?.id;
    
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const filterString = `user_id = "${userId}"`;
      
      const data = await pb.collection('prescriptions').getList(1, 50, {
        filter: filterString,
        sort: '-created',
        $autoCancel: false
      });
      
      setPrescriptions(data.items);
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const createPrescription = async (data) => {
    const record = await pb.collection('prescriptions').create({
      ...data,
      provider_id: currentUser.id
    }, { $autoCancel: false });
    
    await fetchPrescriptions();
    return record;
  };

  return { 
    prescriptions, 
    loading, 
    error, 
    refetch: fetchPrescriptions, 
    createPrescription
  };
}