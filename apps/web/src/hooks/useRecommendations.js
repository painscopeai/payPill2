import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';

export function useRecommendations() {
  const { currentUser } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const records = await pb.collection('recommendations').getFullList({
        filter: `user_id="${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setRecommendations(records);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const updateRecommendationStatus = async (id, status) => {
    const record = await pb.collection('recommendations').update(id, { status }, { $autoCancel: false });
    await fetchRecommendations();
    return record;
  };

  return { recommendations, loading, fetchRecommendations, updateRecommendationStatus };
}