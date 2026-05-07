import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Send, Mail, Inbox, Reply as ReplyIcon, Loader2, ChevronLeft } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { format } from 'date-fns';

function emptyCompose() {
	return { subject: '', body: '', audience: 'all', department: '', specificEmployeeIds: [] };
}

export default function EmployerMessagingPage() {
	const { currentUser } = useAuth();
	const [broadcasts, setBroadcasts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [activeTab, setActiveTab] = useState('inbox');
	const [compose, setCompose] = useState(emptyCompose());
	const [sending, setSending] = useState(false);
	const [openBroadcast, setOpenBroadcast] = useState(null);
	const [openLoading, setOpenLoading] = useState(false);
	const [threadReply, setThreadReply] = useState('');
	const [replyTarget, setReplyTarget] = useState('__all__');
	const [departments, setDepartments] = useState([]);
	const [employees, setEmployees] = useState([]);

	const loadBroadcasts = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch('/employer/broadcasts');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load messages');
			setBroadcasts(body.items || []);
		} catch (e) {
			toast.error(e.message || 'Failed to load messages');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadBroadcasts();
	}, [loadBroadcasts]);

	useEffect(() => {
		(async () => {
			try {
				const res = await apiServerClient.fetch('/employer/employees');
				const body = await res.json().catch(() => ({}));
				if (!res.ok) return;
				const setVals = new Set();
				(body.items || []).forEach((e) => {
					if (e.department) setVals.add(e.department);
				});
				setDepartments(Array.from(setVals));
				setEmployees(
					(body.items || [])
						.filter((e) => e.user_id && e.status === 'active')
						.map((e) => ({
							user_id: e.user_id,
							label: [e.first_name, e.last_name].filter(Boolean).join(' ').trim() || e.email,
							email: e.email,
							department: e.department || '',
						})),
				);
			} catch {
				/* noop */
			}
		})();
	}, []);

	const filteredBroadcasts = useMemo(() => {
		const term = searchTerm.toLowerCase();
		if (!term) return broadcasts;
		return broadcasts.filter(
			(b) => b.subject?.toLowerCase().includes(term) || b.body?.toLowerCase().includes(term),
		);
	}, [broadcasts, searchTerm]);

	const handleSend = async () => {
		if (!compose.subject.trim() || !compose.body.trim()) {
			toast.error('Subject and message are required.');
			return;
		}
		if (compose.audience === 'department' && !compose.department.trim()) {
			toast.error('Select a department for department broadcast.');
			return;
		}
		if (compose.audience === 'specific' && compose.specificEmployeeIds.length === 0) {
			toast.error('Select at least one employee.');
			return;
		}
		setSending(true);
		try {
			const payload = {
				subject: compose.subject.trim(),
				body: compose.body.trim(),
				audience: compose.audience,
				department: compose.audience === 'department' ? compose.department.trim() : null,
				specific_employee_ids:
					compose.audience === 'specific' ? compose.specificEmployeeIds : undefined,
			};
			const res = await apiServerClient.fetch('/employer/broadcasts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Send failed');
			toast.success(`Sent to ${body.recipientCount} recipient(s).`);
			setCompose(emptyCompose());
			setActiveTab('inbox');
			void loadBroadcasts();
		} catch (e) {
			toast.error(e.message || 'Send failed');
		} finally {
			setSending(false);
		}
	};

	const visibleSpecificEmployees = useMemo(() => {
		if (compose.audience !== 'specific') return [];
		if (compose.department?.trim()) {
			return employees.filter((e) => e.department === compose.department.trim());
		}
		return employees;
	}, [compose.audience, compose.department, employees]);

	const toggleSpecificEmployee = (userId) => {
		setCompose((prev) => {
			const exists = prev.specificEmployeeIds.includes(userId);
			return {
				...prev,
				specificEmployeeIds: exists
					? prev.specificEmployeeIds.filter((id) => id !== userId)
					: [...prev.specificEmployeeIds, userId],
			};
		});
	};

	const openThread = async (broadcastId) => {
		setOpenLoading(true);
		try {
			const res = await apiServerClient.fetch(`/employer/broadcasts/${broadcastId}`);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to open thread');
			setOpenBroadcast(body);
			const singleRecipientId =
				Array.isArray(body?.recipients) && body.recipients.length === 1 ? body.recipients[0]?.id : null;
			setReplyTarget(singleRecipientId || '__all__');
			setThreadReply('');
			void loadBroadcasts();
		} catch (e) {
			toast.error(e.message || 'Failed to open thread');
		} finally {
			setOpenLoading(false);
		}
	};

	const sendReply = async () => {
		if (!openBroadcast?.broadcast?.id) return;
		const text = threadReply.trim();
		if (!text) {
			toast.error('Reply cannot be empty');
			return;
		}
		try {
			const recipientCount = Number(openBroadcast?.recipients?.length || 0);
			const isAll = replyTarget === '__all__';
			const forceSingle = recipientCount === 1;
			const res = await apiServerClient.fetch(
				`/employer/broadcasts/${openBroadcast.broadcast.id}/replies`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(
						forceSingle
							? { scope: 'single', recipient_id: openBroadcast.recipients[0]?.id, body: text }
							: isAll
							? { scope: 'all', body: text }
							: { scope: 'single', recipient_id: replyTarget, body: text },
					),
				},
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Reply failed');
			toast.success(isAll ? `Sent to ${body.recipientCount || 0} recipients` : 'Reply sent');
			setThreadReply('');
			void openThread(openBroadcast.broadcast.id);
		} catch (e) {
			toast.error(e.message || 'Reply failed');
		}
	};

	const renderBroadcastList = () => {
		if (loading) {
			return (
				<div className="flex items-center justify-center p-12 text-muted-foreground">
					<Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading messages…
				</div>
			);
		}
		if (filteredBroadcasts.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border rounded-xl bg-card">
					<Inbox className="h-12 w-12 mb-4 opacity-20" />
					<p>No messages yet. Compose one to broadcast to your team.</p>
				</div>
			);
		}
		return (
			<div className="border rounded-xl bg-card divide-y">
				{filteredBroadcasts.map((b) => (
					<button
						key={b.id}
						type="button"
						className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
						onClick={() => openThread(b.id)}
					>
						<div className="shrink-0 h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
							<Mail className="h-5 w-5 text-primary" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex justify-between items-baseline mb-1 gap-2">
								<p className="text-sm font-semibold truncate">{b.subject}</p>
								<p className="text-xs text-muted-foreground whitespace-nowrap">
									{b.created_at ? format(new Date(b.created_at), 'MMM d, h:mm a') : ''}
								</p>
							</div>
							<p className="text-sm text-muted-foreground truncate">{b.body}</p>
							<div className="flex flex-wrap gap-2 mt-2 text-xs">
								<Badge variant="outline">{b.audience}</Badge>
								<span className="text-muted-foreground">
									{b.recipient_count} recipient(s) · {b.read_count} read
								</span>
								{b.reply_count > 0 && (
									<Badge variant="secondary" className="gap-1">
										<ReplyIcon className="h-3 w-3" />
										{b.reply_count} replies
										{b.unread_replies > 0 ? ` (${b.unread_replies} new)` : ''}
									</Badge>
								)}
							</div>
						</div>
					</button>
				))}
			</div>
		);
	};

	const recipientById = useMemo(() => {
		const m = new Map();
		(openBroadcast?.recipients || []).forEach((r) => m.set(r.id, r));
		return m;
	}, [openBroadcast]);

	const unifiedThreadMessages = useMemo(() => {
		if (!openBroadcast) return [];
		const base = [];
		const b = openBroadcast.broadcast;
		const recipientCount = Number(openBroadcast?.recipients?.length || 0);
		const firstReply = (openBroadcast.replies || [])[0];
		const looksPatientInitiated =
			(firstReply?.sender_role === 'patient' && String(firstReply?.body || '').trim() === String(b?.body || '').trim()) ||
			(b?.audience === 'custom' && (openBroadcast?.recipients?.length || 0) === 1 && firstReply?.sender_role === 'patient');
		if (b?.body && !looksPatientInitiated) {
			base.push({
				id: `seed-${b.id}`,
				sender_role: 'employer',
				body: b.body,
				created_at: b.created_at,
				recipient_id: '__all__',
				scope: 'all',
			});
		}
		const replies = (openBroadcast.replies || []).map((r) => ({
			...r,
			scope: r.sender_role === 'employer' ? 'single' : 'single',
		}));
		const grouped = [];
		for (const r of replies) {
			const prev = grouped[grouped.length - 1];
			const isPotentialGroupEcho =
				recipientCount > 1 &&
				r.sender_role === 'employer' &&
				prev &&
				prev.sender_role === 'employer' &&
				String(prev.body || '').trim() === String(r.body || '').trim() &&
				Math.abs(new Date(prev.created_at || 0).getTime() - new Date(r.created_at || 0).getTime()) <= 3000;
			if (isPotentialGroupEcho) {
				prev.scope = 'all';
				prev.recipient_id = '__all__';
				continue;
			}
			grouped.push(r);
		}
		base.push(...grouped);
		return base.sort(
			(a, b2) => new Date(a.created_at || 0).getTime() - new Date(b2.created_at || 0).getTime(),
		);
	}, [openBroadcast]);

	const renderThread = () => {
		if (!openBroadcast) return null;
		const { broadcast } = openBroadcast;
		const selectedRecipient = replyTarget === '__all__' ? null : recipientById.get(replyTarget);
		return (
			<div className="space-y-4">
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={() => setOpenBroadcast(null)} className="gap-2">
						<ChevronLeft className="h-4 w-4" /> Back
					</Button>
					<div>
						<h2 className="text-xl font-semibold">{broadcast.subject}</h2>
						<p className="text-xs text-muted-foreground">
							{broadcast.created_at ? format(new Date(broadcast.created_at), 'PPpp') : ''} · {broadcast.audience}
						</p>
					</div>
				</div>
				<Card>
					<CardContent className="p-4 whitespace-pre-wrap text-sm">{broadcast.body}</CardContent>
				</Card>
				<h3 className="font-semibold mt-4">Conversation ({openBroadcast?.recipients?.length || 0} recipients)</h3>
				<div className="rounded-xl border bg-card p-4 space-y-3 max-h-[55vh] overflow-y-auto">
					{unifiedThreadMessages.map((r) => {
						const rec = recipientById.get(r.recipient_id);
						const senderLabel =
							r.sender_role === 'employer'
								? 'You'
								: rec?.name || rec?.email || rec?.patient_user_id || 'Employee';
						const canReplyToSender = r.sender_role !== 'employer' && r.recipient_id && r.recipient_id !== '__all__';
						const isActiveTarget = canReplyToSender && replyTarget === r.recipient_id;
						return (
							<div
								key={r.id}
								role={canReplyToSender ? 'button' : undefined}
								tabIndex={canReplyToSender ? 0 : undefined}
								onClick={() => {
									if (canReplyToSender) setReplyTarget(r.recipient_id);
								}}
								onKeyDown={(e) => {
									if (!canReplyToSender) return;
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										setReplyTarget(r.recipient_id);
									}
								}}
								className={`max-w-[85%] rounded-xl border px-3 py-2 text-sm ${
									r.sender_role === 'employer'
										? 'ml-auto bg-primary/10 border-primary/20'
										: 'mr-auto bg-muted/30 border-border'
								} ${canReplyToSender ? 'cursor-pointer hover:border-primary/40' : ''} ${
									isActiveTarget ? 'ring-2 ring-primary/40' : ''
								}`}
							>
								<div className="text-xs text-muted-foreground mb-1">
									{senderLabel}
									{r.sender_role === 'employer' && r.recipient_id !== '__all__' && rec ? ` → ${rec.name || rec.email}` : ''}
									{r.recipient_id === '__all__' ? ' → All recipients' : ''}
									{' · '}
									{r.created_at ? format(new Date(r.created_at), 'MMM d, h:mm a') : ''}
								</div>
								<div className="whitespace-pre-wrap">{r.body}</div>
								{canReplyToSender && (
									<div className="mt-2 text-[11px] text-muted-foreground">
										{isActiveTarget ? 'Replying to this sender' : 'Click to reply to this sender'}
									</div>
								)}
							</div>
						);
					})}
				</div>
				<div className="rounded-xl border bg-card p-4 space-y-3">
					<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
						<span>
							{selectedRecipient
								? `Replying to ${selectedRecipient.name || selectedRecipient.email || selectedRecipient.patient_user_id}`
								: 'Replying to all recipients'}
						</span>
						{(openBroadcast?.recipients || []).length > 1 && selectedRecipient && (
							<Button variant="ghost" size="sm" onClick={() => setReplyTarget('__all__')}>
								Clear direct reply
							</Button>
						)}
					</div>
					<div className="flex gap-2 items-end">
						<Textarea
							placeholder={
								selectedRecipient
									? `Reply to ${selectedRecipient.name || selectedRecipient.email || 'employee'}...`
									: 'Reply to all recipients...'
							}
							className="min-h-[72px]"
							value={threadReply}
							onChange={(e) => setThreadReply(e.target.value)}
						/>
						<Button onClick={sendReply} className="gap-2">
							<Send className="h-4 w-4" /> Send
						</Button>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-background flex flex-col">
			<Helmet><title>Messaging - PayPill</title></Helmet>
			<Header />

			<main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
				<div className="mb-8">
					<h1 className="text-3xl font-bold tracking-tight">Communications Hub</h1>
					<p className="text-muted-foreground">
						Welcome{currentUser?.first_name ? `, ${currentUser.first_name}` : ''}. Compose announcements to your team
						and follow up on individual replies.
					</p>
				</div>

				{openBroadcast ? (
					openLoading ? (
						<div className="flex items-center justify-center p-12 text-muted-foreground">
							<Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading thread…
						</div>
					) : (
						renderThread()
					)
				) : (
					<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
						<div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
							<TabsList className="grid w-full md:w-[300px] grid-cols-2">
								<TabsTrigger value="inbox">Inbox / Sent</TabsTrigger>
								<TabsTrigger value="compose">Compose</TabsTrigger>
							</TabsList>

							<div className="relative w-full md:w-64">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search messages..."
									className="pl-9"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>
						</div>

						<TabsContent value="inbox" className="mt-0">
							{renderBroadcastList()}
						</TabsContent>

						<TabsContent value="compose" className="mt-0">
							<Card className="shadow-sm border-border/50">
								<CardContent className="p-6 space-y-6">
									<div className="space-y-4">
										<div className="grid gap-2">
											<Label>Audience</Label>
											<Select
												value={compose.audience}
												onValueChange={(v) => setCompose({ ...compose, audience: v })}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="all">All Employees</SelectItem>
													<SelectItem value="department">By Department</SelectItem>
													<SelectItem value="specific">Specific Employee(s)</SelectItem>
												</SelectContent>
											</Select>
										</div>
										{(compose.audience === 'department' || compose.audience === 'specific') && (
											<div className="grid gap-2">
												<Label>
													{compose.audience === 'department'
														? 'Department'
														: 'Department (optional filter)'}
												</Label>
												<Select
													value={
														compose.audience === 'specific'
															? compose.department || '__all__'
															: compose.department || undefined
													}
													onValueChange={(v) =>
														setCompose({
															...compose,
															department: v === '__all__' ? '' : v,
														})
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Pick a department" />
													</SelectTrigger>
													<SelectContent>
														{compose.audience === 'specific' && (
															<SelectItem value="__all__">All Departments</SelectItem>
														)}
														{departments.length === 0 ? (
															<SelectItem value="__none__" disabled>No departments on roster yet</SelectItem>
														) : (
															departments.map((d) => (
																<SelectItem key={d} value={d}>{d}</SelectItem>
															))
														)}
													</SelectContent>
												</Select>
											</div>
										)}
										{compose.audience === 'specific' && (
											<div className="grid gap-2">
												<div className="flex items-center justify-between">
													<Label>Specific Employees (multi-select)</Label>
													<span className="text-xs text-muted-foreground">
														{compose.specificEmployeeIds.length} selected
													</span>
												</div>
												<div className="max-h-52 overflow-y-auto rounded-md border bg-card p-2 space-y-1">
													{visibleSpecificEmployees.length === 0 ? (
														<p className="text-sm text-muted-foreground px-2 py-1">
															No active employees found for this filter.
														</p>
													) : (
														visibleSpecificEmployees.map((e) => {
															const checked = compose.specificEmployeeIds.includes(e.user_id);
															return (
																<label
																	key={e.user_id}
																	className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/40 cursor-pointer"
																>
																	<input
																		type="checkbox"
																		checked={checked}
																		onChange={() => toggleSpecificEmployee(e.user_id)}
																	/>
																	<div className="min-w-0">
																		<p className="text-sm font-medium truncate">{e.label}</p>
																		<p className="text-xs text-muted-foreground truncate">{e.email}</p>
																	</div>
																</label>
															);
														})
													)}
												</div>
											</div>
										)}
										<div className="grid gap-2">
											<Label>Subject</Label>
											<Input
												placeholder="Enter subject"
												value={compose.subject}
												onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
											/>
										</div>
										<div className="grid gap-2">
											<Label>Message</Label>
											<Textarea
												placeholder="Write your message here..."
												className="min-h-[250px] resize-y"
												value={compose.body}
												onChange={(e) => setCompose({ ...compose, body: e.target.value })}
											/>
										</div>
									</div>

									<div className="flex justify-end items-center pt-4 border-t">
										<Button onClick={handleSend} disabled={sending} className="gap-2">
											{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
											{sending ? 'Sending…' : 'Send broadcast'}
										</Button>
									</div>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				)}
			</main>
		</div>
	);
}
