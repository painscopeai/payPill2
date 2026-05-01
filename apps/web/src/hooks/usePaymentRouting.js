import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext';

export const usePaymentRouting = () => {
  const { currentUser } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const records = await pb.collection('payment_routing_rules').getFullList({
        filter: `insurance_id="${currentUser.id}"`,
        $autoCancel: false
      });
      setRules(records);
    } catch (error) {
      console.error('Error fetching routing rules:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  return { rules, loading, fetchRules };
};