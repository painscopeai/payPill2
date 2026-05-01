import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useInsuranceData = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [claims, setClaims] = useState([]);

  const fetchMembers = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const records = await pb.collection('insurance_members').getFullList({
        filter: `insurance_id="${currentUser.id}"`,
        expand: 'user_id',
        $autoCancel: false
      });
      setMembers(records);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchClaims = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const records = await pb.collection('insurance_claims').getFullList({
        filter: `insurance_id="${currentUser.id}"`,
        $autoCancel: false
      });
      setClaims(records);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  return { members, claims, loading, fetchMembers, fetchClaims };
};