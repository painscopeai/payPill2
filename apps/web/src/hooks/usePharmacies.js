import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';

export function usePharmacies() {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPharmacies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await pb.collection('pharmacies').getList(1, 50, {
        sort: 'name',
        $autoCancel: false
      });
      
      setPharmacies(data.items);
    } catch (err) {
      console.error('Error fetching pharmacies:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPharmacies();
  }, [fetchPharmacies]);

  return { 
    pharmacies, 
    loading, 
    error, 
    refetch: fetchPharmacies 
  };
}