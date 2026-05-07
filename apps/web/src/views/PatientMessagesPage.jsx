import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Inbox, Mail, Send, Loader2, ChevronLeft } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PatientMessagesPage() {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [openThread, setOpenThread] = useState(null);
	const [openLoading, setOpenLoading] = useState(false);
	const [reply, setReply] = useState('');
	const [sending, setSending] = useState(false);

	const loadList = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch('/patient/messages');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load messages');
			setItems(body.items || []);
		} catch (e) {
			toast.error(e.message || 'Failed to load messages');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { void loadList(); }, [loadList]);

	const open = async (recipientId) => {
		setOpenLoading(true);
		setReply('');
		try {
			const res = await apiServerClient.fetch(`/patient/messages/${recipientId}`);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to open');
			setOpenThread(body);
			void loadList();
		} catch (e) {
			toast.error(e.message || 'Failed to open');
		} finally {
			setOpenLoading(false);
		}
	};

	const sendReply = async () => {
		if (!openThread?.recipient?.id || !reply.trim()) {
			toast.error('Reply cannot be empty');
			return;
		}
		setSending(true);
		try {
			const res = await apiServerClient.fetch(
				`/patient/messages/${openThread.recipient.id}/replies`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ body: reply.trim() }),
				},
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Send failed');
			setReply('');
			toast.success('Reply sent');
			await open(openThread.recipient.id);
		} catch (e) {
			toast.error(e.message || 'Send failed');
		} finally {
			setSending(false);
		}
	};

	if (openThread) {
		const { broadcast, employer, replies } = openThread;
		return (
			<div className="max-w-3xl mx-auto space-y-4">
				<Helmet><title>Messages - PayPill</title></Helmet>
				<Button variant="outline" size="sm" className="gap-2" onClick={() => setOpenThread(null)}>
					<ChevronLeft className="h-4 w-4" /> Back to inbox
				</Button>
				<Card>
					<CardContent className="p-6 space-y-3">
						<div className="text-xs text-muted-foreground">
							From {employer?.company_name || employer?.name || employer?.email || 'your employer'} ·{' '}
							{broadcast?.created_at ? format(new Date(broadcast.created_at), 'PPpp') : ''}
						</div>
						<h2 className="text-xl font-semibold">{broadcast?.subject}</h2>
						<div className="whitespace-pre-wrap text-sm">{broadcast?.body}</div>
					</CardContent>
				</Card>

				<div className="space-y-2">
					{(replies || []).map((r) => (
						<div
							key={r.id}
							className={`text-sm p-3 rounded-md border ${r.sender_role === 'patient' ? 'bg-primary/5 border-primary/20 ml-8' : 'bg-muted/30 border-border mr-8'}`}
						>
							<div className="text-xs text-muted-foreground mb-1">
								{r.sender_role === 'patient' ? 'You' : employer?.company_name || employer?.email || 'Employer'} ·{' '}
								{r.created_at ? format(new Date(r.created_at), 'MMM d, h:mm a') : ''}
							</div>
							<div className="whitespace-pre-wrap">{r.body}</div>
						</div>
					))}
				</div>

				<Card>
					<CardContent className="p-4 space-y-2">
						<Textarea
							placeholder="Reply to your employer…"
							className="min-h-[80px]"
							value={reply}
							onChange={(e) => setReply(e.target.value)}
						/>
						<div className="flex justify-end">
							<Button onClick={sendReply} disabled={sending || !reply.trim()} className="gap-2">
								{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
								Send reply
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (openLoading) {
		return (
			<div className="flex items-center justify-center py-20 text-muted-foreground">
				<Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading thread…
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto space-y-6">
			<Helmet><title>Messages - PayPill</title></Helmet>
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Messages</h1>
				<p className="text-muted-foreground">Announcements from your employer and your replies.</p>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
				</div>
			) : items.length === 0 ? (
				<div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border rounded-xl bg-card">
					<Inbox className="h-12 w-12 mb-4 opacity-20" />
					<p>No messages from your employer yet.</p>
				</div>
			) : (
				<div className="border rounded-xl bg-card divide-y">
					{items.map((m) => {
						const unread = !m.read_at || m.unread_from_employer > 0;
						return (
							<button
								key={m.recipient_id}
								type="button"
								className={`w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors ${unread ? 'bg-primary/5' : ''}`}
								onClick={() => open(m.recipient_id)}
							>
								<div className="shrink-0 h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
									<Mail className={`h-5 w-5 ${unread ? 'text-primary' : 'text-muted-foreground'}`} />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex justify-between items-baseline mb-1 gap-2">
										<p className={`text-sm truncate ${unread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
											{m.employer_label}
										</p>
										<p className="text-xs text-muted-foreground whitespace-nowrap">
											{m.last_at ? format(new Date(m.last_at), 'MMM d, h:mm a') : ''}
										</p>
									</div>
									<p className={`text-sm truncate ${unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
										{m.subject}
									</p>
									<p className="text-xs text-muted-foreground truncate">{m.preview}</p>
									{m.unread_from_employer > 0 && (
										<Badge className="mt-1" variant="secondary">
											{m.unread_from_employer} new replies
										</Badge>
									)}
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
