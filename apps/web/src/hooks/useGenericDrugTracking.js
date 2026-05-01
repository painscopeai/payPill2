import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';

export const useGenericDrugTracking = () => {
  const { currentUser } = useAuth();
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTrackingData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const records = await pb.collection('generic_drug_tracking').getFullList({
        filter: `insurance_id="${currentUser.id}"`,
        $autoCancel: false
      });
      setTrackingData(records);
    } catch (error) {
      console.error('Error fetching generic drug data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  return { trackingData, loading, fetchTrackingData };
};