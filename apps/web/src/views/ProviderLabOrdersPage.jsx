import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { toast } from 'sonner';
import { FlaskConical, User, AlertTriangle } from 'lucide-react';
import { formatPersonDisplayName } from '@/lib/providerPatientChartFormat';

function formatDateShort(value) {
	if (!value) return '—';
	const d = /^\d{4}-\d{2}-\d{2}/.test(String(value))
		? new Date(`${value}T12:00:00`)
		: new Date(value);
	return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function patientLabel(patient) {
	if (!patient) return 'Patient';
	return (
		formatPersonDisplayName(
			[patient.first_name, patient.last_name].filter(Boolean).join(' ').trim() || patient.email || 'Patient',
		) || 'Patient'
	);
}

function statusBadge(status) {
	const s = String(status || 'pending');
	if (s === 'completed') return <Badge className="bg-emerald-600">Completed</Badge>;
	if (s === 'in_progress') return <Badge variant="secondary">In progress</Badge>;
	return <Badge variant="outline">Awaiting</Badge>;
}

export default function ProviderLabOrdersPage() {
	const [loading, setLoading] = useState(true);
	const [items, setItems] = useState([]);
	const [message, setMessage] = useState(null);
	const [filter, setFilter] = useState('open');
	const [activeRowId, setActiveRowId] = useState(null);
	const [resultText, setResultText] = useState('');
	const [notes, setNotes] = useState('');
	const [submittingId, setSubmittingId] = useState(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch(`/provider/service-queue?status=${encodeURIComponent(filter)}`);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load lab queue');
			setItems(Array.isArray(body.items) ? body.items : []);
			setMessage(body.message || null);
		} catch (e) {
			setItems([]);
			setMessage(e instanceof Error ? e.message : 'Failed to load');
		} finally {
			setLoading(false);
		}
	}, [filter]);

	useEffect(() => {
		void load();
	}, [load]);

	const submitResult = async (itemId) => {
		const summary = resultText.trim();
		if (!summary) {
			toast.error('Enter a result summary before completing.');
			return;
		}
		setSubmittingId(itemId);
		try {
			const res = await apiServerClient.fetch(`/provider/service-queue/${encodeURIComponent(itemId)}/complete-lab`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lab_result_summary: summary,
					notes: notes.trim() || null,
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to save result');
			toast.success('Lab result recorded and routed to patient health record.');
			setActiveRowId(null);
			setResultText('');
			setNotes('');
			await load();
		} catch (e) {
			toast.error(e.message || 'Failed to save result');
		} finally {
			setSubmittingId(null);
		}
	};

	const openCount = filter === 'open' ? items.filter((i) => i.status !== 'completed').length : null;

	return (
		<div className="space-y-6 max-w-5xl">
			<Helmet>
				<title>Lab orders — Provider</title>
			</Helmet>
			<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
						<FlaskConical className="h-8 w-8 text-sky-600" />
						Laboratory queue
					</h1>
					<p className="text-muted-foreground mt-1 max-w-2xl">
						Orders routed when a clinician finalizes a consultation with laboratory tests. Enter results here — patient
						clinical charts remain with the doctor.
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant={filter === 'open' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('open')}>
						Open{openCount != null ? ` (${openCount})` : ''}
					</Button>
					<Button variant={filter === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('completed')}>
						Completed
					</Button>
					<Button variant="outline" size="sm" asChild>
						<Link to="/provider/settings/catalog/labs">Lab catalog</Link>
					</Button>
				</div>
			</div>

			{message ? (
				<Card className="border-amber-500/30 bg-amber-500/5">
					<CardContent className="p-4 text-sm flex items-start gap-2">
						<AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
						<span>{message}</span>
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Specimen & results</CardTitle>
					<CardDescription>Collect, process, and release results for orders sent from clinical encounters.</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="p-10 flex justify-center">
							<LoadingSpinner />
						</div>
					) : items.length === 0 ? (
						<p className="p-8 text-center text-muted-foreground text-sm">
							{filter === 'open'
								? 'No lab orders in queue. Tests appear when a doctor finalizes a visit with laboratory orders, or when a patient has a pending lab action from a consultation.'
								: 'No completed lab orders in this view.'}
						</p>
					) : (
						<ul className="space-y-4">
							{items.map((row) => {
								const payload = row.payload || {};
								const testName = payload.test_name || payload.name || 'Lab test';
								const code = payload.code ? ` · ${payload.code}` : '';
								const priority = payload.priority ? String(payload.priority) : '';
								const isOpen = row.status !== 'completed';
								const name = patientLabel(row.patient);
								const patientId = row.patient_user_id;
								const editing = activeRowId === row.id;

								return (
									<li key={row.id} className="rounded-lg border border-border/80 p-4 space-y-3">
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div>
												<p className="font-semibold text-lg">{testName}</p>
												<p className="text-sm text-muted-foreground">
													{code.replace(/^ · /, '')}
													{priority ? ` · Priority: ${priority}` : ''}
												</p>
												<p className="text-xs text-muted-foreground mt-1">Ordered {formatDateShort(row.created_at)}</p>
											</div>
											<div className="flex flex-col items-end gap-2">
												{row.assignment_mode === 'patient_choice' && !row.fulfillment_org_id ? (
													<Badge variant="secondary" className="text-xs">
														Unassigned — claim on complete
													</Badge>
												) : null}
												{statusBadge(row.status)}
												{patientId ? (
													<Button variant="ghost" size="sm" className="h-8" asChild>
														<Link to={`/provider/patients/${patientId}`}>
															<User className="h-3.5 w-3.5 mr-1" />
															{name}
														</Link>
													</Button>
												) : (
													<span className="text-sm text-muted-foreground">{name}</span>
												)}
											</div>
										</div>

										{!isOpen ? (
											<div className="border-t pt-3 text-sm space-y-1">
												<p className="text-muted-foreground">
													Completed {formatDateShort(row.fulfilled_at)}
												</p>
												{row.lab_result_summary ? (
													<p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3">{row.lab_result_summary}</p>
												) : null}
											</div>
										) : editing ? (
											<div className="border-t pt-3 space-y-3">
												<div className="space-y-1.5">
													<Label>Result summary</Label>
													<Textarea
														rows={4}
														placeholder="Values, interpretation, critical flags…"
														value={resultText}
														onChange={(e) => setResultText(e.target.value)}
														required
													/>
												</div>
												<div className="space-y-1.5">
													<Label>Internal notes (optional)</Label>
													<Textarea
														rows={2}
														placeholder="Technologist notes, specimen ID"
														value={notes}
														onChange={(e) => setNotes(e.target.value)}
													/>
												</div>
												<div className="flex gap-2 justify-end">
													<Button variant="outline" onClick={() => setActiveRowId(null)}>
														Cancel
													</Button>
													<Button
														className="bg-sky-600 hover:bg-sky-700 text-white"
														disabled={submittingId === row.id}
														onClick={() => void submitResult(row.id)}
													>
														{submittingId === row.id ? 'Saving…' : 'Complete & release result'}
													</Button>
												</div>
											</div>
										) : (
											<div className="border-t pt-3 flex justify-end">
												<Button
													className="bg-sky-600 hover:bg-sky-700 text-white"
													onClick={() => {
														setActiveRowId(row.id);
														setResultText('');
														setNotes('');
													}}
												>
													Enter results
												</Button>
											</div>
										)}
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
