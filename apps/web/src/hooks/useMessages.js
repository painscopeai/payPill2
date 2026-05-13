import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/supabaseMappedCollections';
import { useAuth } from '@/contexts/AuthContext';
import apiServerClient from '@/lib/apiServerClient';

export function useMessages() {
	const { currentUser, userRole } = useAuth();
	const [messages, setMessages] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchMessages = useCallback(async () => {
		if (!currentUser) return;
		setLoading(true);
		try {
			if (userRole === 'provider') {
				const res = await apiServerClient.fetch('/provider/messages');
				const body = await res.json().catch(() => ({}));
				if (!res.ok) {
					setMessages([]);
					return;
				}
				const items = Array.isArray(body.items) ? body.items : [];
				setMessages(
					items.map((m) => ({
						id: m.id,
						subject: m.subject || 'Message',
						content: m.body || '',
						date_sent: m.created_at,
						read_at: m.read_at,
						patient_label: m.patient_label,
					})),
				);
				return;
			}

			const records = await pb.collection('messages').getFullList({
				filter: `userId="${currentUser.id}" || sender_id="${currentUser.id}"`,
				sort: '-date_sent',
				$autoCancel: false,
			});
			setMessages(records);
		} catch (err) {
			console.error('Error fetching messages:', err);
			setMessages([]);
		} finally {
			setLoading(false);
		}
	}, [currentUser, userRole]);

	useEffect(() => {
		void fetchMessages();
	}, [fetchMessages]);

	const sendMessage = async (data) => {
		if (userRole === 'provider') {
			const res = await apiServerClient.fetch('/provider/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					patient_user_id: data.patient_user_id,
					subject: data.subject,
					body: data.body,
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body?.error || 'Send failed');
			await fetchMessages();
			return body;
		}

		const record = await pb.collection('messages').create(
			{
				...data,
				sender_id: currentUser.id,
				date_sent: new Date().toISOString(),
				read_status: false,
			},
			{ $autoCancel: false },
		);
		await fetchMessages();
		return record;
	};

	return { messages, loading, fetchMessages, sendMessage };
}
