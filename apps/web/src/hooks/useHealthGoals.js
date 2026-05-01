import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext';

export function useHealthGoals() {
  const { currentUser } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const records = await pb.collection('health_goals').getFullList({
        filter: `user_id="${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setGoals(records);
    } catch (err) {
      console.error('Error fetching health goals:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = async (data) => {
    const record = await pb.collection('health_goals').create({
      ...data,
      user_id: currentUser.id,
      status: 'active'
    }, { $autoCancel: false });
    await fetchGoals();
    return record;
  };

  const updateGoal = async (id, data) => {
    const record = await pb.collection('health_goals').update(id, data, { $autoCancel: false });
    await fetchGoals();
    return record;
  };

  const deleteGoal = async (id) => {
    await pb.collection('health_goals').delete(id, { $autoCancel: false });
    await fetchGoals();
  };

  return { goals, loading, fetchGoals, createGoal, updateGoal, deleteGoal };
}