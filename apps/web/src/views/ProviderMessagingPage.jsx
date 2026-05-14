import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, Send, User } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ProviderMessagingPage() {
	const [threads, setThreads] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selectedPatientId, setSelectedPatientId] = useState(null);
	const [threadLoading, setThreadLoading] = useState(false);
	const [detail, setDetail] = useState(null);
	const [draft, setDraft] = useState('');
	const [sending, setSending] = useState(false);

	const loadThreads = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch('/provider/messages');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load');
			const t = Array.isArray(body.threads) ? body.threads : [];
			setThreads(t);
		} catch (e) {
			toast.error(e.message || 'Failed to load');
			setThreads([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadThreads();
	}, [loadThreads]);

	useEffect(() => {
		if (!selectedPatientId && threads.length > 0 && threads[0]?.patient_user_id) {
			setSelectedPatientId(threads[0].patient_user_id);
		}
	}, [threads, selectedPatientId]);

	const loadThread = useCallback(async (patientUserId) => {
		if (!patientUserId) {
			setDetail(null);
			return;
		}
		setThreadLoading(true);
		setDraft('');
		try {
			const res = await apiServerClient.fetch(`/provider/messages/${encodeURIComponent(patientUserId)}`);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to open thread');
			setDetail(body);
		} catch (e) {
			toast.error(e.message || 'Failed to open thread');
			setDetail(null);
		} finally {
			setThreadLoading(false);
		}
	}, []);

	useEffect(() => {
		if (selectedPatientId) void loadThread(selectedPatientId);
		else setDetail(null);
	}, [selectedPatientId, loadThread]);

	const send = async () => {
		const body = draft.trim();
		if (!selectedPatientId || !body) return;
		setSending(true);
		try {
			const res = await apiServerClient.fetch('/provider/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ patient_user_id: selectedPatientId, body }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(json.error || 'Send failed');
			setDraft('');
			toast.success('Sent');
			await loadThread(selectedPatientId);
			await loadThreads();
		} catch (e) {
			toast.error(e.message || 'Send failed');
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="space-y-6 max-w-6xl mx-auto">
			<Helmet>
				<title>Messages - PayPill</title>
			</Helmet>
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Secure messaging</h1>
				<p className="text-muted-foreground mt-1">
					One inbox per patient: walk-ins, rostered employees, and assigned patients you have a visit or care
					relationship with.
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[520px]">
				<Card className="lg:col-span-2 border-border/60 flex flex-col overflow-hidden">
					<CardHeader className="py-3 border-b bg-muted/20">
						<CardTitle className="text-base flex items-center gap-2">
							<MessageSquare className="h-4 w-4" /> Conversations
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0 flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
						{loading ? (
							<div className="p-8 flex justify-center">
								<LoadingSpinner />
							</div>
						) : threads.length === 0 ? (
							<div className="p-8 text-center text-sm text-muted-foreground">
								No threads yet. When patients message you or you write from their chart, threads appear here.
							</div>
						) : (
							<ul className="divide-y">
								{threads.map((t) => {
									const active = t.patient_user_id === selectedPatientId;
									return (
										<li key={t.patient_user_id}>
											<button
												type="button"
												onClick={() => setSelectedPatientId(t.patient_user_id)}
												className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/40 transition-colors ${
													active ? 'bg-primary/10 border-l-4 border-l-primary' : ''
												}`}
											>
												<div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
													<User className="h-4 w-4 text-muted-foreground" />
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex items-center justify-between gap-2">
														<p className={`text-sm truncate ${active ? 'font-semibold' : 'font-medium'}`}>
															{t.patient_label}
														</p>
														{t.unread_for_provider > 0 ? (
															<Badge variant="secondary" className="shrink-0 text-[10px] px-1.5">
																{t.unread_for_provider}
															</Badge>
														) : null}
													</div>
													<p className="text-xs text-muted-foreground truncate mt-0.5">{t.preview}</p>
													<p className="text-[10px] text-muted-foreground mt-1">
														{t.last_at ? format(new Date(t.last_at), 'MMM d, h:mm a') : ''}
													</p>
												</div>
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</CardContent>
				</Card>

				<Card className="lg:col-span-3 border-border/60 flex flex-col min-h-[420px]">
					<CardHeader className="py-3 border-b bg-muted/20">
						<CardTitle className="text-base">
							{detail?.patient_label || (selectedPatientId ? 'Conversation' : 'Select a conversation')}
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0 flex-1 flex flex-col min-h-0">
						{!selectedPatientId ? (
							<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8">
								Choose a patient thread on the left.
							</div>
						) : threadLoading ? (
							<div className="flex-1 flex items-center justify-center p-8">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : (
							<>
								<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/15 max-h-[calc(100vh-320px)]">
									{(detail?.messages || []).map((m) => {
										const pid = detail?.patient_user_id;
										const mine = Boolean(pid && m.sender_user_id !== pid);
										return (
											<div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
												<div
													className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
														mine
															? 'bg-primary text-primary-foreground rounded-br-md'
															: 'bg-card border rounded-bl-md'
													}`}
												>
													<div className="whitespace-pre-wrap">{m.body}</div>
													<div
														className={`mt-1 text-[10px] ${mine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
													>
														{m.created_at ? format(new Date(m.created_at), 'MMM d, h:mm a') : ''}
													</div>
												</div>
											</div>
										);
									})}
								</div>
								<div className="border-t p-3 flex gap-2 bg-background">
									<Textarea
										placeholder="Write a secure message…"
										className="min-h-[52px] max-h-32 resize-none"
										value={draft}
										onChange={(e) => setDraft(e.target.value)}
									/>
									<Button
										type="button"
										className="shrink-0 self-end gap-2"
										disabled={sending || !draft.trim()}
										onClick={() => void send()}
									>
										{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
										Send
									</Button>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
