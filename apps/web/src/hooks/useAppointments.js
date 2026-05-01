import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';

export function useAppointments() {
  const { currentUser, userRole } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppointments = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const filter = userRole === 'provider' 
        ? `provider_id="${currentUser.id}"` 
        : `userId="${currentUser.id}"`;
      
      const records = await pb.collection('appointments').getFullList({
        filter,
        sort: '-appointment_date',
        $autoCancel: false
      });
      setAppointments(records);
      setError(null);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, userRole]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const createAppointment = async (data) => {
    const record = await pb.collection('appointments').create({
      ...data,
      userId: currentUser.id
    }, { $autoCancel: false });
    await fetchAppointments();
    return record;
  };

  const updateAppointment = async (id, data) => {
    const record = await pb.collection('appointments').update(id, data, { $autoCancel: false });
    await fetchAppointments();
    return record;
  };

  return { appointments, loading, error, fetchAppointments, createAppointment, updateAppointment };
}