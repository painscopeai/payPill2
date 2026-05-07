import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Inbox, Mail, Send, Loader2, PlusCircle } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function PatientMessagesPage() {
	const [items, setItems] = useState([]);
	const [employers, setEmployers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [openThread, setOpenThread] = useState(null);
	const [openLoading, setOpenLoading] = useState(false);
	const [reply, setReply] = useState('');
	const [sending, setSending] = useState(false);
	const [showComposer, setShowComposer] = useState(false);
	const [newMessage, setNewMessage] = useState({ employer_id: '', subject: '', body: '' });

	const loadList = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch('/patient/messages');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load messages');
			setItems(body.items || []);
			setEmployers(body.employers || []);
		} catch (e) {
			toast.error(e.message || 'Failed to load messages');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { void loadList(); }, [loadList]);

	useEffect(() => {
		if (employers.length === 1 && !newMessage.employer_id) {
			setNewMessage((m) => ({ ...m, employer_id: employers[0].employer_id }));
		}
	}, [employers, newMessage.employer_id]);

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

	const sendNewMessage = async () => {
		if (!newMessage.employer_id) {
			toast.error('Select an employer');
			return;
		}
		if (!newMessage.body.trim()) {
			toast.error('Message cannot be empty');
			return;
		}
		setSending(true);
		try {
			const res = await apiServerClient.fetch('/patient/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					employer_id: newMessage.employer_id,
					subject: newMessage.subject.trim(),
					body: newMessage.body.trim(),
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to send message');
			toast.success('Message sent');
			setShowComposer(false);
			setNewMessage({ employer_id: newMessage.employer_id, subject: '', body: '' });
			await loadList();
			if (body.recipient_id) await open(body.recipient_id);
		} catch (e) {
			toast.error(e.message || 'Failed to send message');
		} finally {
			setSending(false);
		}
	};

	const threadMessages = useMemo(() => {
		if (!openThread) return [];
		const base = [
			{
				id: `broadcast-${openThread.broadcast?.id || 'base'}`,
				sender_role: 'employer',
				body: openThread.broadcast?.body || '',
				created_at: openThread.broadcast?.created_at || null,
				is_seed: true,
			},
			...(openThread.replies || []),
		];
		return base;
	}, [openThread]);

	if (openLoading) {
		return (
			<div className="flex items-center justify-center py-20 text-muted-foreground">
				<Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading thread…
			</div>
		);
	}

	return (
		<div className="max-w-6xl mx-auto space-y-6">
			<Helmet><title>Messages - PayPill</title></Helmet>
			<div className="flex items-center justify-between gap-3">
				<h1 className="text-3xl font-bold tracking-tight">Messages</h1>
				<Button variant="outline" className="gap-2" onClick={() => setShowComposer((v) => !v)}>
					<PlusCircle className="h-4 w-4" /> New message
				</Button>
			</div>
			<p className="text-muted-foreground">Announcements from your employer and your replies.</p>

			{showComposer && (
				<Card>
					<CardContent className="p-4 space-y-4">
						<div className="grid gap-2">
							<Label>Employer</Label>
							<Select
								value={newMessage.employer_id || undefined}
								onValueChange={(v) => setNewMessage((m) => ({ ...m, employer_id: v }))}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select employer" />
								</SelectTrigger>
								<SelectContent>
									{employers.map((e) => (
										<SelectItem key={e.employer_id} value={e.employer_id}>
											{e.employer_label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label>Subject (optional)</Label>
							<Input
								value={newMessage.subject}
								onChange={(e) => setNewMessage((m) => ({ ...m, subject: e.target.value }))}
								placeholder="Subject"
							/>
						</div>
						<div className="grid gap-2">
							<Label>Message</Label>
							<Textarea
								value={newMessage.body}
								onChange={(e) => setNewMessage((m) => ({ ...m, body: e.target.value }))}
								placeholder="Write your message..."
								className="min-h-[110px]"
							/>
						</div>
						<div className="flex justify-end">
							<Button onClick={sendNewMessage} disabled={sending} className="gap-2">
								{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
								Send
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{loading ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
					<div className="lg:col-span-1">
						{items.length === 0 ? (
							<div className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground border rounded-xl bg-card">
								<Inbox className="h-12 w-12 mb-4 opacity-20" />
								<p>No messages from your employer yet.</p>
							</div>
						) : (
							<div className="border rounded-xl bg-card divide-y max-h-[70vh] overflow-y-auto">
								{items.map((m) => {
									const unread = !m.read_at || m.unread_from_employer > 0;
									const isSelected = openThread?.recipient?.id === m.recipient_id;
									return (
										<button
											key={m.recipient_id}
											type="button"
											className={`w-full text-left p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/10' : unread ? 'bg-primary/5' : ''}`}
											onClick={() => open(m.recipient_id)}
										>
											<div className="shrink-0 h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
												<Mail className={`h-5 w-5 ${unread ? 'text-primary' : 'text-muted-foreground'}`} />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex justify-between items-baseline gap-2">
													<p className={`text-sm truncate ${unread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
														{m.employer_label}
													</p>
													<p className="text-[10px] text-muted-foreground whitespace-nowrap">
														{m.last_at ? format(new Date(m.last_at), 'MMM d') : ''}
													</p>
												</div>
												<p className="text-sm truncate">{m.subject}</p>
												{m.unread_from_employer > 0 && (
													<Badge className="mt-1" variant="secondary">
														{m.unread_from_employer} new
													</Badge>
												)}
											</div>
										</button>
									);
								})}
							</div>
						)}
					</div>
					<div className="lg:col-span-2">
						{openThread ? (
							<Card className="h-[70vh] flex flex-col">
								<CardContent className="p-0 flex-1 flex flex-col min-h-0">
									<div className="border-b p-4">
										<p className="font-semibold">
											{openThread.employer?.company_name || openThread.employer?.name || openThread.employer?.email}
										</p>
										<p className="text-xs text-muted-foreground">{openThread.broadcast?.subject}</p>
									</div>
									<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
										{threadMessages.map((r) => {
											const isMine = r.sender_role === 'patient';
											return (
												<div key={r.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
													<div
														className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
															isMine
																? 'bg-primary text-primary-foreground rounded-br-sm'
																: 'bg-white border rounded-bl-sm'
														}`}
													>
														<div className="whitespace-pre-wrap">{r.body}</div>
														<div
															className={`mt-1 text-[10px] ${isMine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
														>
															{r.created_at ? format(new Date(r.created_at), 'MMM d, h:mm a') : ''}
														</div>
													</div>
												</div>
											);
										})}
									</div>
									<div className="border-t p-3 flex gap-2">
										<Textarea
											placeholder="Type a message..."
											className="min-h-[46px] max-h-28 resize-none"
											value={reply}
											onChange={(e) => setReply(e.target.value)}
										/>
										<Button onClick={sendReply} disabled={sending || !reply.trim()} className="gap-2 self-end">
											{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
										</Button>
									</div>
								</CardContent>
							</Card>
						) : (
							<div className="h-[70vh] border rounded-xl bg-card flex items-center justify-center text-muted-foreground">
								Select a conversation to start chatting.
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
