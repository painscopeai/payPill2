import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/supabaseMappedCollections';
import { useAuth } from '@/contexts/AuthContext';

export function useRefillStatus() {
  const { currentUser } = useAuth();
  const [refills, setRefills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRefills = useCallback(async () => {
    const userId = currentUser?.id;
    
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // 1. Fetch refill requests
      const data = await pb.collection('refill_requests').getList(1, 50, {
        filter: `user_id = "${userId}"`,
        sort: '-created',
        $autoCancel: false
      });

      // 2. Fetch associated prescriptions to enrich the data
      // (Since prescription_id is a text field, we cannot use expand)
      const prescriptionIds = [...new Set(data.items.map(r => r.prescription_id).filter(Boolean))];
      let prescriptionsMap = {};

      if (prescriptionIds.length > 0) {
        const filter = prescriptionIds.map(id => `id="${id}"`).join(' || ');
        const presData = await pb.collection('prescriptions').getFullList({ 
          filter, 
          $autoCancel: false 
        });
        
        presData.forEach(p => {
          prescriptionsMap[p.id] = p;
        });
      }

      // 3. Enrich and set state
      const enrichedRefills = data.items.map(refill => ({
        ...refill,
        prescription_details: prescriptionsMap[refill.prescription_id] || null
      }));

      setRefills(enrichedRefills);
    } catch (err) {
      console.error('Error fetching refill status:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchRefills();
  }, [fetchRefills]);

  return { 
    refills, 
    loading, 
    error, 
    refetch: fetchRefills 
  };
}