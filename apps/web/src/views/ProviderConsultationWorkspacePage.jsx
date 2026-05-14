import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { toast } from 'sonner';
import { Calendar, ExternalLink, FileText, User } from 'lucide-react';
import { formatPersonDisplayName } from '@/lib/providerPatientChartFormat';

function formatDateShort(value) {
	if (!value) return '—';
	const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
	return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function formatTime(t) {
	if (!t) return '';
	const s = String(t).slice(0, 5);
	return s || '';
}

function emptyVitals() {
	return {
		bp_systolic: '',
		bp_diastolic: '',
		heart_rate: '',
		temperature_c: '',
		weight_kg: '',
		spo2: '',
	};
}

function vitalsFromEncounter(v) {
	const base = emptyVitals();
	if (!v || typeof v !== 'object') return base;
	return {
		bp_systolic: v.bp_systolic != null ? String(v.bp_systolic) : '',
		bp_diastolic: v.bp_diastolic != null ? String(v.bp_diastolic) : '',
		heart_rate: v.heart_rate != null ? String(v.heart_rate) : '',
		temperature_c: v.temperature_c != null ? String(v.temperature_c) : '',
		weight_kg: v.weight_kg != null ? String(v.weight_kg) : '',
		spo2: v.spo2 != null ? String(v.spo2) : '',
	};
}

function parseVitalsForSave(form) {
	const out = {};
	const num = (k, raw) => {
		const t = String(raw || '').trim();
		if (!t) return;
		const n = Number(t);
		if (!Number.isFinite(n)) return;
		out[k] = n;
	};
	num('bp_systolic', form.bp_systolic);
	num('bp_diastolic', form.bp_diastolic);
	num('heart_rate', form.heart_rate);
	num('temperature_c', form.temperature_c);
	num('weight_kg', form.weight_kg);
	num('spo2', form.spo2);
	return out;
}

export default function ProviderConsultationWorkspacePage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const appointmentFromUrl = searchParams.get('appointment');

	const [listLoading, setListLoading] = useState(true);
	const [listError, setListError] = useState(null);
	const [items, setItems] = useState([]);
	const [message, setMessage] = useState(null);

	const [selectedId, setSelectedId] = useState(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailError, setDetailError] = useState(null);
	const [appointment, setAppointment] = useState(null);
	const [patient, setPatient] = useState(null);

	const [subjective, setSubjective] = useState('');
	const [objective, setObjective] = useState('');
	const [assessment, setAssessment] = useState('');
	const [plan, setPlan] = useState('');
	const [additionalNotes, setAdditionalNotes] = useState('');
	const [vitalsForm, setVitalsForm] = useState(emptyVitals);
	const [encounterStatus, setEncounterStatus] = useState('draft');

	const [saving, setSaving] = useState(false);

	const loadList = useCallback(async () => {
		setListLoading(true);
		setListError(null);
		setMessage(null);
		try {
			const res = await apiServerClient.fetch('/provider/consultations');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load queue');
			setItems(Array.isArray(body.items) ? body.items : []);
			if (body.message) setMessage(body.message);
		} catch (e) {
			setListError(e.message || 'Failed to load');
			setItems([]);
		} finally {
			setListLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadList();
	}, [loadList]);

	const applyEncounterPayload = useCallback((enc) => {
		if (!enc) {
			setSubjective('');
			setObjective('');
			setAssessment('');
			setPlan('');
			setAdditionalNotes('');
			setVitalsForm(emptyVitals());
			setEncounterStatus('draft');
			return;
		}
		setSubjective(enc.subjective || '');
		setObjective(enc.objective || '');
		setAssessment(enc.assessment || '');
		setPlan(enc.plan || '');
		setAdditionalNotes(enc.additional_notes || '');
		setVitalsForm(vitalsFromEncounter(enc.vitals));
		setEncounterStatus(enc.status === 'finalized' ? 'finalized' : 'draft');
	}, []);

	const loadDetail = useCallback(
		async (appointmentId) => {
			if (!appointmentId) return;
			setDetailLoading(true);
			setDetailError(null);
			try {
				const res = await apiServerClient.fetch(
					`/provider/consultations/${encodeURIComponent(appointmentId)}/encounter`,
				);
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Failed to load encounter');
				setAppointment(body.appointment || null);
				setPatient(body.patient || null);
				applyEncounterPayload(body.encounter);
			} catch (e) {
				setDetailError(e.message || 'Failed to load');
				setAppointment(null);
				setPatient(null);
				applyEncounterPayload(null);
			} finally {
				setDetailLoading(false);
			}
		},
		[applyEncounterPayload],
	);

	const selectAppointment = useCallback(
		(id) => {
			setSelectedId(id);
			const next = new URLSearchParams(searchParams);
			if (id) next.set('appointment', id);
			else next.delete('appointment');
			setSearchParams(next, { replace: true });
			void loadDetail(id);
		},
		[loadDetail, searchParams, setSearchParams],
	);

	useEffect(() => {
		if (listLoading) return;
		if (!items.length) {
			return;
		}
		if (appointmentFromUrl && !items.some((i) => i.appointment_id === appointmentFromUrl)) {
			const next = new URLSearchParams(searchParams);
			next.delete('appointment');
			setSearchParams(next, { replace: true });
			return;
		}
		if (appointmentFromUrl && items.some((i) => i.appointment_id === appointmentFromUrl)) {
			if (selectedId !== appointmentFromUrl) {
				setSelectedId(appointmentFromUrl);
				void loadDetail(appointmentFromUrl);
			}
			return;
		}
		if (!appointmentFromUrl && !selectedId && items[0]) {
			selectAppointment(items[0].appointment_id);
		}
	}, [appointmentFromUrl, items, listLoading, loadDetail, selectedId, selectAppointment, searchParams, setSearchParams]);

	const patientName = useMemo(() => {
		if (!patient) return 'Patient';
		return (
			formatPersonDisplayName(
				[patient.first_name, patient.last_name].filter(Boolean).join(' ').trim() ||
					String(patient.email || '').trim() ||
					'Patient',
			) || 'Patient'
		);
	}, [patient]);

	const save = async (status) => {
		if (!selectedId) return;
		setSaving(true);
		try {
			const res = await apiServerClient.fetch(
				`/provider/consultations/${encodeURIComponent(selectedId)}/encounter`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						subjective,
						objective,
						assessment,
						plan,
						additional_notes: additionalNotes,
						vitals: parseVitalsForSave(vitalsForm),
						status: status === 'finalized' ? 'finalized' : 'draft',
					}),
				},
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Save failed');
			if (body.encounter) applyEncounterPayload(body.encounter);
			toast.success(status === 'finalized' ? 'Encounter finalized.' : 'Draft saved.');
			await loadList();
		} catch (e) {
			toast.error(e.message || 'Save failed');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-6 max-w-7xl mx-auto">
			<Helmet>
				<title>Consultations — PayPill</title>
			</Helmet>
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Consultation workspace</h1>
				<p className="text-muted-foreground mt-1 max-w-3xl">
					Consultation and follow-up bookings from your schedule appear here. Open a visit to document in SOAP
					format and jump to the full patient chart when needed.
				</p>
			</div>

			{message && !listError ? (
				<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
					{message}
				</div>
			) : null}

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[480px]">
				<Card className="lg:col-span-4 flex flex-col overflow-hidden">
					<CardHeader className="pb-3">
						<CardTitle className="text-lg flex items-center gap-2">
							<Calendar className="h-5 w-5 text-muted-foreground" />
							Queue
						</CardTitle>
						<CardDescription>Consultation & follow-up appointments</CardDescription>
					</CardHeader>
					<CardContent className="pt-0 flex-1 min-h-0 flex flex-col">
						{listLoading ? (
							<LoadingSpinner />
						) : listError ? (
							<p className="text-sm text-destructive">{listError}</p>
						) : items.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No consultation or follow-up bookings yet. When patients choose those visit types during
								booking, they will appear here automatically.
							</p>
						) : (
							<ScrollArea className="h-[min(60vh,520px)] pr-3">
								<ul className="space-y-2">
									{items.map((row) => {
										const active = row.appointment_id === selectedId;
										const when = `${formatDateShort(row.appointment_date)}${row.appointment_time ? ` · ${formatTime(row.appointment_time)}` : ''}`;
										return (
											<li key={row.appointment_id}>
												<button
													type="button"
													onClick={() => selectAppointment(row.appointment_id)}
													className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
														active
															? 'border-primary bg-primary/5 ring-1 ring-primary/20'
															: 'border-border hover:bg-muted/50'
													}`}
												>
													<div className="font-medium text-sm line-clamp-1">{row.patient_name}</div>
													<div className="text-xs text-muted-foreground mt-0.5">{when}</div>
													<div className="flex flex-wrap gap-1 mt-1.5">
														<Badge variant="secondary" className="text-xs font-normal">
															{row.visit_label}
														</Badge>
														{row.encounter_status === 'finalized' ? (
															<Badge className="text-xs font-normal">Finalized</Badge>
														) : row.encounter_status === 'draft' ? (
															<Badge variant="outline" className="text-xs font-normal">
																Draft
															</Badge>
														) : null}
													</div>
												</button>
											</li>
										);
									})}
								</ul>
							</ScrollArea>
						)}
					</CardContent>
				</Card>

				<Card className="lg:col-span-8 flex flex-col">
					<CardHeader>
						<CardTitle className="text-lg flex items-center gap-2">
							<FileText className="h-5 w-5 text-muted-foreground" />
							Encounter
						</CardTitle>
						<CardDescription>Structured documentation (SOAP) for the selected visit</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{!selectedId && !listLoading && items.length > 0 ? (
							<p className="text-sm text-muted-foreground">Select a visit from the queue.</p>
						) : null}
						{detailLoading ? (
							<LoadingSpinner />
						) : detailError ? (
							<p className="text-sm text-destructive">{detailError}</p>
						) : selectedId && appointment ? (
							<>
								<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 rounded-lg border bg-muted/30 p-4">
									<div className="space-y-1 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<User className="h-4 w-4 shrink-0 text-muted-foreground" />
											<span className="font-semibold truncate">{patientName}</span>
											{encounterStatus === 'finalized' ? (
												<Badge>Finalized</Badge>
											) : (
												<Badge variant="outline">Draft</Badge>
											)}
										</div>
										{patient ? (
											<div className="text-sm text-muted-foreground space-y-0.5">
												{patient.date_of_birth ? (
													<div>DOB: {formatDateShort(patient.date_of_birth)}</div>
												) : null}
												{patient.phone ? <div>{patient.phone}</div> : null}
												{patient.email ? <div className="truncate">{patient.email}</div> : null}
											</div>
										) : (
											<p className="text-sm text-muted-foreground">Profile not found for this user.</p>
										)}
									</div>
									{patient?.id ? (
										<Button variant="outline" size="sm" asChild className="shrink-0">
											<Link to={`/provider/patients/${encodeURIComponent(patient.id)}`}>
												Full chart
												<ExternalLink className="h-3.5 w-3.5 ml-1.5" />
											</Link>
										</Button>
									) : null}
								</div>

								<div className="rounded-lg border p-4 text-sm space-y-1">
									<div className="font-medium">
										{formatDateShort(appointment.appointment_date)}
										{appointment.appointment_time ? ` · ${formatTime(appointment.appointment_time)}` : ''}
									</div>
									<div className="text-muted-foreground capitalize">
										{appointment.visit_slug?.replace(/-/g, ' ') || 'Visit'}
									</div>
									{appointment.reason ? (
										<div className="mt-2">
											<span className="text-muted-foreground">Reason: </span>
											{appointment.reason}
										</div>
									) : null}
									{appointment.confirmation_number ? (
										<div className="text-xs text-muted-foreground mt-1">
											Confirmation #{appointment.confirmation_number}
										</div>
									) : null}
								</div>

								<div>
									<h3 className="text-sm font-semibold mb-3">Vitals</h3>
									<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
										<div className="space-y-1.5">
											<Label htmlFor="bp-sys" className="text-xs">
												BP systolic
											</Label>
											<Input
												id="bp-sys"
												inputMode="numeric"
												value={vitalsForm.bp_systolic}
												onChange={(e) => setVitalsForm((f) => ({ ...f, bp_systolic: e.target.value }))}
											/>
										</div>
										<div className="space-y-1.5">
											<Label htmlFor="bp-dia" className="text-xs">
												BP diastolic
											</Label>
											<Input
												id="bp-dia"
												inputMode="numeric"
												value={vitalsForm.bp_diastolic}
												onChange={(e) => setVitalsForm((f) => ({ ...f, bp_diastolic: e.target.value }))}
											/>
										</div>
										<div className="space-y-1.5">
											<Label htmlFor="hr" className="text-xs">
												Heart rate
											</Label>
											<Input
												id="hr"
												inputMode="numeric"
												value={vitalsForm.heart_rate}
												onChange={(e) => setVitalsForm((f) => ({ ...f, heart_rate: e.target.value }))}
											/>
										</div>
										<div className="space-y-1.5">
											<Label htmlFor="temp" className="text-xs">
												Temp (°C)
											</Label>
											<Input
												id="temp"
												inputMode="decimal"
												value={vitalsForm.temperature_c}
												onChange={(e) => setVitalsForm((f) => ({ ...f, temperature_c: e.target.value }))}
											/>
										</div>
										<div className="space-y-1.5">
											<Label htmlFor="wt" className="text-xs">
												Weight (kg)
											</Label>
											<Input
												id="wt"
												inputMode="decimal"
												value={vitalsForm.weight_kg}
												onChange={(e) => setVitalsForm((f) => ({ ...f, weight_kg: e.target.value }))}
											/>
										</div>
										<div className="space-y-1.5">
											<Label htmlFor="spo2" className="text-xs">
												SpO₂ (%)
											</Label>
											<Input
												id="spo2"
												inputMode="numeric"
												value={vitalsForm.spo2}
												onChange={(e) => setVitalsForm((f) => ({ ...f, spo2: e.target.value }))}
											/>
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="subjective">Subjective</Label>
										<Textarea
											id="subjective"
											rows={4}
											placeholder="History, symptoms, patient narrative…"
											value={subjective}
											onChange={(e) => setSubjective(e.target.value)}
											className="resize-y min-h-[100px]"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="objective">Objective</Label>
										<Textarea
											id="objective"
											rows={4}
											placeholder="Exam findings, observations, vitals narrative…"
											value={objective}
											onChange={(e) => setObjective(e.target.value)}
											className="resize-y min-h-[100px]"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="assessment">Assessment</Label>
										<Textarea
											id="assessment"
											rows={3}
											placeholder="Clinical impression, diagnoses…"
											value={assessment}
											onChange={(e) => setAssessment(e.target.value)}
											className="resize-y min-h-[80px]"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="plan">Plan</Label>
										<Textarea
											id="plan"
											rows={4}
											placeholder="Orders, medications, follow-up, education…"
											value={plan}
											onChange={(e) => setPlan(e.target.value)}
											className="resize-y min-h-[100px]"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="addl">Additional notes</Label>
										<Textarea
											id="addl"
											rows={2}
											placeholder="Optional context, coding, billing notes…"
											value={additionalNotes}
											onChange={(e) => setAdditionalNotes(e.target.value)}
											className="resize-y"
										/>
									</div>
								</div>

								<div className="flex flex-wrap gap-2 pt-2 border-t">
									<Button type="button" variant="secondary" disabled={saving} onClick={() => void save('draft')}>
										Save draft
									</Button>
									<Button type="button" disabled={saving} onClick={() => void save('finalized')}>
										Finalize encounter
									</Button>
									<span className="text-xs text-muted-foreground self-center ml-auto">
										{encounterStatus === 'finalized'
											? 'Marked finalized — you can still edit and save again if needed.'
											: 'Draft — save before the patient leaves or finalize when complete.'}
									</span>
								</div>
							</>
						) : items.length === 0 && !listLoading ? (
							<p className="text-sm text-muted-foreground">Nothing to show until a matching booking exists.</p>
						) : null}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
