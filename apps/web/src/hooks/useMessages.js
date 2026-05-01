import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';

export function useMessages() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const records = await pb.collection('messages').getFullList({
        filter: `userId="${currentUser.id}" || sender_id="${currentUser.id}"`,
        sort: '-date_sent',
        $autoCancel: false
      });
      setMessages(records);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async (data) => {
    const record = await pb.collection('messages').create({
      ...data,
      sender_id: currentUser.id,
      date_sent: new Date().toISOString(),
      read_status: false
    }, { $autoCancel: false });
    await fetchMessages();
    return record;
  };

  return { messages, loading, fetchMessages, sendMessage };
}