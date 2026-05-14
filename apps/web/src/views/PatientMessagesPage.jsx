import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Inbox, Mail, Send, Loader2, PlusCircle, Building2, Stethoscope, Megaphone } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

function threadKey(t) {
	if (t.kind === 'employer_broadcast') return `b:${t.open?.recipient_id || t.recipient_id}`;
	if (t.kind === 'workplace_direct') return `w:${t.open?.thread_id}`;
	if (t.kind === 'clinical_provider') return `c:${t.open?.provider_user_id}`;
	return String(t.sort_at);
}

function ThreadIcon({ kind }) {
	if (kind === 'clinical_provider') return <Stethoscope className="h-5 w-5 text-teal-600" />;
	if (kind === 'workplace_direct') return <Building2 className="h-5 w-5 text-sky-600" />;
	return <Megaphone className="h-5 w-5 text-violet-600" />;
}

export default function PatientMessagesPage() {
	const { currentUser } = useAuth();
	const [threads, setThreads] = useState([]);
	const [employers, setEmployers] = useState([]);
	const [messagableProviders, setMessagableProviders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState('all');
	const [openKind, setOpenKind] = useState(null);
	const [openPayload, setOpenPayload] = useState(null);
	const [openLoading, setOpenLoading] = useState(false);
	const [reply, setReply] = useState('');
	const [sending, setSending] = useState(false);
	const [showEmployerComposer, setShowEmployerComposer] = useState(false);
	const [showProviderComposer, setShowProviderComposer] = useState(false);
	const [newEmployerMessage, setNewEmployerMessage] = useState({ employer_id: '', subject: '', body: '' });
	const [newProviderMessage, setNewProviderMessage] = useState({ provider_user_id: '', body: '' });

	const loadList = useCallback(async () => {
		setLoading(true);
		try {
			const [res, provRes] = await Promise.all([
				apiServerClient.fetch('/patient/messages'),
				apiServerClient.fetch('/patient/messagable-providers'),
			]);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load messages');
			setThreads(Array.isArray(body.threads) ? body.threads : []);
			setEmployers(Array.isArray(body.employers) ? body.employers : []);
			const pb = await provRes.json().catch(() => ({}));
			if (provRes.ok) setMessagableProviders(Array.isArray(pb.items) ? pb.items : []);
			else setMessagableProviders([]);
		} catch (e) {
			toast.error(e.message || 'Failed to load messages');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadList();
	}, [loadList]);

	useEffect(() => {
		if (employers.length === 1 && !newEmployerMessage.employer_id) {
			setNewEmployerMessage((m) => ({ ...m, employer_id: employers[0].employer_id }));
		}
	}, [employers, newEmployerMessage.employer_id]);

	const filteredThreads = useMemo(() => {
		if (filter === 'care') return threads.filter((t) => t.kind === 'clinical_provider');
		if (filter === 'work') return threads.filter((t) => t.kind === 'workplace_direct' || t.kind === 'employer_broadcast');
		return threads;
	}, [threads, filter]);

	const open = async (t, opts = { quiet: false }) => {
		const k = t.kind;
		if (!opts.quiet) {
			setOpenLoading(true);
		}
		setReply('');
		setOpenKind(k);
		if (!opts.quiet) {
			setOpenPayload(null);
		}
		try {
			if (k === 'employer_broadcast') {
				const rid = t.open?.recipient_id || t.recipient_id;
				const res = await apiServerClient.fetch(`/patient/messages/${encodeURIComponent(rid)}`);
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Failed to open');
				setOpenPayload({ mode: 'broadcast', ...body });
			} else if (k === 'workplace_direct') {
				const tid = t.open?.thread_id;
				const res = await apiServerClient.fetch(`/patient/messages/workplace/${encodeURIComponent(tid)}`);
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Failed to open');
				setOpenPayload({ mode: 'workplace', ...body });
			} else if (k === 'clinical_provider') {
				const pid = t.open?.provider_user_id;
				const res = await apiServerClient.fetch(`/patient/messages/clinical/${encodeURIComponent(pid)}`);
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Failed to open');
				setOpenPayload({ mode: 'clinical', ...body });
			}
			void loadList();
		} catch (e) {
			toast.error(e.message || 'Failed to open');
			if (!opts.quiet) setOpenKind(null);
		} finally {
			if (!opts.quiet) setOpenLoading(false);
		}
	};

	const sendReply = async () => {
		const text = reply.trim();
		if (!text) {
			toast.error('Message cannot be empty');
			return;
		}
		setSending(true);
		try {
			if (openPayload?.mode === 'broadcast') {
				const rid = openPayload.recipient?.id;
				const res = await apiServerClient.fetch(`/patient/messages/${encodeURIComponent(rid)}/replies`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ body: text }),
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Send failed');
			} else if (openPayload?.mode === 'workplace') {
				const tid = openPayload.thread?.id;
				const res = await apiServerClient.fetch(`/patient/messages/workplace/${encodeURIComponent(tid)}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ body: text }),
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Send failed');
			} else if (openPayload?.mode === 'clinical') {
				const pid = openPayload.provider_user_id;
				const res = await apiServerClient.fetch(`/patient/messages/clinical/${encodeURIComponent(pid)}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ body: text }),
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Send failed');
			} else return;
			setReply('');
			toast.success('Sent');
			if (openPayload?.mode === 'broadcast' && openPayload?.recipient?.id) {
				await open(
					{
						kind: 'employer_broadcast',
						open: { recipient_id: openPayload.recipient.id },
						recipient_id: openPayload.recipient.id,
						sort_at: new Date().toISOString(),
					},
					{ quiet: true },
				);
			} else if (openPayload?.mode === 'workplace' && openPayload?.thread?.id) {
				await open(
					{
						kind: 'workplace_direct',
						open: { thread_id: openPayload.thread.id },
						sort_at: new Date().toISOString(),
					},
					{ quiet: true },
				);
			} else if (openPayload?.mode === 'clinical' && openPayload?.provider_user_id) {
				await open(
					{
						kind: 'clinical_provider',
						open: { provider_user_id: openPayload.provider_user_id },
						sort_at: new Date().toISOString(),
					},
					{ quiet: true },
				);
			}
			await loadList();
		} catch (e) {
			toast.error(e.message || 'Send failed');
		} finally {
			setSending(false);
		}
	};

	const sendNewEmployerMessage = async () => {
		if (!newEmployerMessage.employer_id) {
			toast.error('Select an employer');
			return;
		}
		if (!newEmployerMessage.body.trim()) {
			toast.error('Message cannot be empty');
			return;
		}
		setSending(true);
		try {
			const res = await apiServerClient.fetch('/patient/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					employer_id: newEmployerMessage.employer_id,
					subject: newEmployerMessage.subject.trim(),
					body: newEmployerMessage.body.trim(),
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to send message');
			toast.success('Message sent');
			setShowEmployerComposer(false);
			setNewEmployerMessage({ employer_id: newEmployerMessage.employer_id, subject: '', body: '' });
			await loadList();
			if (body.thread_id) {
				await open(
					{ kind: 'workplace_direct', open: { thread_id: body.thread_id }, sort_at: new Date().toISOString() },
					{ quiet: true },
				);
			}
		} catch (e) {
			toast.error(e.message || 'Failed to send message');
		} finally {
			setSending(false);
		}
	};

	const sendNewProviderMessage = async () => {
		if (!newProviderMessage.provider_user_id) {
			toast.error('Select a provider');
			return;
		}
		if (!newProviderMessage.body.trim()) {
			toast.error('Message cannot be empty');
			return;
		}
		setSending(true);
		try {
			const res = await apiServerClient.fetch(
				`/patient/messages/clinical/${encodeURIComponent(newProviderMessage.provider_user_id)}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ body: newProviderMessage.body.trim() }),
				},
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to send');
			toast.success('Message sent');
			setShowProviderComposer(false);
			setNewProviderMessage({ provider_user_id: newProviderMessage.provider_user_id, body: '' });
			await loadList();
			await open(
				{
					kind: 'clinical_provider',
					open: { provider_user_id: newProviderMessage.provider_user_id },
					sort_at: new Date().toISOString(),
				},
				{ quiet: true },
			);
		} catch (e) {
			toast.error(e.message || 'Failed to send');
		} finally {
			setSending(false);
		}
	};

	const broadcastLines = useMemo(() => {
		if (!openPayload || openPayload.mode !== 'broadcast') return [];
		return [
			{
				id: `seed-${openPayload.broadcast?.id || 'x'}`,
				isMine: false,
				body: openPayload.broadcast?.body || '',
				created_at: openPayload.broadcast?.created_at,
			},
			...(openPayload.replies || []).map((r) => ({
				id: r.id,
				isMine: r.sender_role === 'patient',
				body: r.body,
				created_at: r.created_at,
			})),
		];
	}, [openPayload]);

	const simpleLines = useMemo(() => {
		if (!openPayload || openPayload.mode === 'broadcast') return [];
		const uid = currentUser?.id;
		const rows = openPayload.messages || [];
		return rows.map((r) => ({
			id: r.id,
			isMine: r.sender_user_id === uid,
			body: r.body,
			created_at: r.created_at,
		}));
	}, [openPayload, currentUser?.id]);

	const headerTitle = useMemo(() => {
		if (!openPayload) return '';
		if (openPayload.mode === 'broadcast') {
			return (
				openPayload.employer?.company_name ||
				openPayload.employer?.name ||
				openPayload.employer?.email ||
				'Employer'
			);
		}
		if (openPayload.mode === 'workplace') {
			return (
				openPayload.employer?.company_name ||
				openPayload.employer?.name ||
				openPayload.employer?.email ||
				'Employer'
			);
		}
		return openPayload.provider_label || 'Care team';
	}, [openPayload]);

	const headerSubtitle = useMemo(() => {
		if (!openPayload) return '';
		if (openPayload.mode === 'broadcast') return openPayload.broadcast?.subject || '';
		if (openPayload.mode === 'workplace') return 'Direct message';
		return 'Secure clinical messaging';
	}, [openPayload]);

	const lines = openPayload?.mode === 'broadcast' ? broadcastLines : simpleLines;

	if (openLoading) {
		return (
			<div className="flex items-center justify-center py-20 text-muted-foreground">
				<Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading thread…
			</div>
		);
	}

	return (
		<div className="max-w-6xl mx-auto space-y-6">
			<Helmet>
				<title>Messages - PayPill</title>
			</Helmet>
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Messages</h1>
					<p className="text-muted-foreground mt-1">
						Care team, employer announcements, and workplace direct messages in one place.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{employers.length > 0 ? (
						<Button variant="outline" className="gap-2" onClick={() => setShowEmployerComposer((v) => !v)}>
							<PlusCircle className="h-4 w-4" /> Message employer
						</Button>
					) : null}
					{messagableProviders.length > 0 ? (
						<Button variant="outline" className="gap-2" onClick={() => setShowProviderComposer((v) => !v)}>
							<PlusCircle className="h-4 w-4" /> Message provider
						</Button>
					) : null}
				</div>
			</div>

			<Tabs value={filter} onValueChange={setFilter} className="w-full max-w-md">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="all">All</TabsTrigger>
					<TabsTrigger value="care">Care team</TabsTrigger>
					<TabsTrigger value="work">Employer</TabsTrigger>
				</TabsList>
			</Tabs>

			{showEmployerComposer && employers.length > 0 ? (
				<Card>
					<CardContent className="p-4 space-y-4">
						<div className="grid gap-2">
							<Label>Employer</Label>
							<Select
								value={newEmployerMessage.employer_id || undefined}
								onValueChange={(v) => setNewEmployerMessage((m) => ({ ...m, employer_id: v }))}
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
								value={newEmployerMessage.subject}
								onChange={(e) => setNewEmployerMessage((m) => ({ ...m, subject: e.target.value }))}
								placeholder="Subject"
							/>
						</div>
						<div className="grid gap-2">
							<Label>Message</Label>
							<Textarea
								value={newEmployerMessage.body}
								onChange={(e) => setNewEmployerMessage((m) => ({ ...m, body: e.target.value }))}
								placeholder="Write your message…"
								className="min-h-[110px]"
							/>
						</div>
						<div className="flex justify-end">
							<Button onClick={sendNewEmployerMessage} disabled={sending} className="gap-2">
								{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
								Send
							</Button>
						</div>
					</CardContent>
				</Card>
			) : null}

			{showProviderComposer && messagableProviders.length > 0 ? (
				<Card>
					<CardContent className="p-4 space-y-4">
						<div className="grid gap-2">
							<Label>Provider</Label>
							<Select
								value={newProviderMessage.provider_user_id || undefined}
								onValueChange={(v) => setNewProviderMessage((m) => ({ ...m, provider_user_id: v }))}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select provider" />
								</SelectTrigger>
								<SelectContent>
									{messagableProviders.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label>Message</Label>
							<Textarea
								value={newProviderMessage.body}
								onChange={(e) => setNewProviderMessage((m) => ({ ...m, body: e.target.value }))}
								placeholder="Write your message…"
								className="min-h-[110px]"
							/>
						</div>
						<div className="flex justify-end">
							<Button onClick={sendNewProviderMessage} disabled={sending} className="gap-2">
								{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
								Send
							</Button>
						</div>
					</CardContent>
				</Card>
			) : null}

			{loading ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
					<div className="lg:col-span-1">
						{filteredThreads.length === 0 ? (
							<div className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground border rounded-xl bg-card">
								<Inbox className="h-12 w-12 mb-4 opacity-20" />
								<p>No conversations in this view yet.</p>
							</div>
						) : (
							<div className="border rounded-xl bg-card divide-y max-h-[70vh] overflow-y-auto">
								{filteredThreads.map((m) => {
									const unread = Number(m.unread || 0) > 0;
									const active =
										(m.kind === 'employer_broadcast' &&
											openPayload?.mode === 'broadcast' &&
											openPayload?.recipient?.id === (m.open?.recipient_id || m.recipient_id)) ||
										(m.kind === 'workplace_direct' &&
											openPayload?.mode === 'workplace' &&
											openPayload?.thread?.id === m.open?.thread_id) ||
										(m.kind === 'clinical_provider' &&
											openPayload?.mode === 'clinical' &&
											openPayload?.provider_user_id === m.open?.provider_user_id);
									return (
										<button
											key={threadKey(m)}
											type="button"
											className={`w-full text-left p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors ${active ? 'bg-primary/10' : unread ? 'bg-primary/5' : ''}`}
											onClick={() => void open(m)}
										>
											<div className="shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
												<ThreadIcon kind={m.kind} />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex justify-between items-baseline gap-2">
													<p className={`text-sm truncate ${unread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>
														{m.title}
													</p>
													<p className="text-[10px] text-muted-foreground whitespace-nowrap">
														{m.sort_at ? format(new Date(m.sort_at), 'MMM d') : ''}
													</p>
												</div>
												<p className="text-xs text-muted-foreground truncate">{m.subtitle}</p>
												{unread ? (
													<Badge className="mt-1" variant="secondary">
														{m.unread} new
													</Badge>
												) : null}
											</div>
										</button>
									);
								})}
							</div>
						)}
					</div>
					<div className="lg:col-span-2">
						{openPayload ? (
							<Card className="h-[70vh] flex flex-col">
								<CardContent className="p-0 flex-1 flex flex-col min-h-0">
									<div className="border-b p-4 flex items-start gap-3">
										<div className="mt-0.5">
											<ThreadIcon kind={openKind} />
										</div>
										<div>
											<p className="font-semibold leading-tight">{headerTitle}</p>
											<p className="text-xs text-muted-foreground mt-0.5">{headerSubtitle}</p>
										</div>
									</div>
									<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
										{lines.map((r) => (
											<div key={r.id} className={`flex ${r.isMine ? 'justify-end' : 'justify-start'}`}>
												<div
													className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
														r.isMine
															? 'bg-primary text-primary-foreground rounded-br-sm'
															: 'bg-card border rounded-bl-sm'
													}`}
												>
													<div className="whitespace-pre-wrap">{r.body}</div>
													<div
														className={`mt-1 text-[10px] ${r.isMine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
													>
														{r.created_at ? format(new Date(r.created_at), 'MMM d, h:mm a') : ''}
													</div>
												</div>
											</div>
										))}
									</div>
									<div className="border-t p-3 flex gap-2">
										<Textarea
											placeholder="Type a message…"
											className="min-h-[46px] max-h-28 resize-none"
											value={reply}
											onChange={(e) => setReply(e.target.value)}
										/>
										<Button onClick={() => void sendReply()} disabled={sending || !reply.trim()} className="gap-2 self-end">
											{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
										</Button>
									</div>
								</CardContent>
							</Card>
						) : (
							<div className="h-[70vh] border rounded-xl bg-card flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
								Select a conversation or start a new message to your employer or care team.
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
