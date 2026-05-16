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
import { Separator } from '@/components/ui/separator';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { toast } from 'sonner';
import { Calendar, ExternalLink, FileText, User, Trash2, Plus, Pill, FlaskConical } from 'lucide-react';
import { formatPersonDisplayName } from '@/lib/providerPatientChartFormat';
import { useAuth } from '@/contexts/AuthContext';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { MedicationFrequencySelect } from '@/components/provider/MedicationFrequencySelect.jsx';
import { MEDICATION_ROUTE_OPTIONS, buildPrescriptionSig, drugCatalogToRxLine } from '@/lib/prescriptionMedicationOptions';

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

function newId(prefix) {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newRxLine(over = {}) {
	return {
		id: newId('rx'),
		medication_name: '',
		strength: '',
		dose: '',
		route: 'oral',
		frequency: '',
		duration_days: '',
		quantity: '',
		refills: '0',
		sig: '',
		catalog_id: null,
		...over,
	};
}

function newLabLine(over = {}) {
	return {
		id: newId('lab'),
		test_name: '',
		code: '',
		indication: '',
		priority: 'routine',
		catalog_id: null,
		...over,
	};
}

function normalizeEncounterLines(raw, factory) {
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((x) => x && typeof x === 'object')
		.map((x) => {
			const base = factory();
			return { ...base, ...x, id: x.id || base.id };
		});
}

export default function ProviderConsultationWorkspacePage() {
	const { currentUser } = useAuth();
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

	const [drugCatalog, setDrugCatalog] = useState([]);
	const [rxTemplates, setRxTemplates] = useState([]);
	const [labCatalog, setLabCatalog] = useState([]);
	const [prescriptionLines, setPrescriptionLines] = useState([]);
	const [labOrders, setLabOrders] = useState([]);

	const [saving, setSaving] = useState(false);
	const [formularyPick, setFormularyPick] = useState('');
	const [templatePick, setTemplatePick] = useState('');

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

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const [dRes, tRes, lRes] = await Promise.all([
					apiServerClient.fetch('/provider/catalog/drugs'),
					apiServerClient.fetch('/provider/prescription-templates'),
					apiServerClient.fetch('/provider/catalog/labs'),
				]);
				const dBody = await dRes.json().catch(() => ({}));
				const tBody = await tRes.json().catch(() => ({}));
				const lBody = await lRes.json().catch(() => ({}));
				if (cancelled) return;
				if (dRes.ok) setDrugCatalog(Array.isArray(dBody.items) ? dBody.items : []);
				if (tRes.ok) setRxTemplates(Array.isArray(tBody.items) ? tBody.items.filter((t) => t.is_active !== false) : []);
				if (lRes.ok) setLabCatalog(Array.isArray(lBody.items) ? lBody.items : []);
			} catch {
				/* non-blocking */
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const applyEncounterPayload = useCallback((enc) => {
		if (!enc) {
			setSubjective('');
			setObjective('');
			setAssessment('');
			setPlan('');
			setAdditionalNotes('');
			setVitalsForm(emptyVitals());
			setPrescriptionLines([]);
			setLabOrders([]);
			setEncounterStatus('draft');
			return;
		}
		setSubjective(enc.subjective || '');
		setObjective(enc.objective || '');
		setAssessment(enc.assessment || '');
		setPlan(enc.plan || '');
		setAdditionalNotes(enc.additional_notes || '');
		setVitalsForm(vitalsFromEncounter(enc.vitals));
		setPrescriptionLines(normalizeEncounterLines(enc.prescription_lines, () => newRxLine()));
		setLabOrders(normalizeEncounterLines(enc.lab_orders, () => newLabLine()));
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
		if (!appointmentFromUrl && !selectedId && items.length) {
			const firstOpen = items.find((i) => i.encounter_status !== 'finalized');
			const pick = firstOpen || items[0];
			selectAppointment(pick.appointment_id);
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

	const prescriberDisplay = useMemo(() => {
		const n = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ').trim();
		if (n) return n;
		return String(currentUser?.email || '').trim() || 'Licensed prescriber';
	}, [currentUser]);

	const queueSections = useMemo(() => {
		function cmpDateDesc(a, b) {
			const sa = `${a.appointment_date}T${String(a.appointment_time || '00:00:00').slice(0, 8)}`;
			const sb = `${b.appointment_date}T${String(b.appointment_time || '00:00:00').slice(0, 8)}`;
			return sb.localeCompare(sa);
		}
		const open = [];
		const finalized = [];
		for (const row of items) {
			if (row.encounter_status === 'finalized') finalized.push(row);
			else open.push(row);
		}
		open.sort(cmpDateDesc);
		finalized.sort(cmpDateDesc);
		return { open, finalized };
	}, [items]);

	const renderQueueRow = (row) => {
		const active = row.appointment_id === selectedId;
		const when = `${formatDateShort(row.appointment_date)}${row.appointment_time ? ` · ${formatTime(row.appointment_time)}` : ''}`;
		return (
			<li key={row.appointment_id}>
				<button
					type="button"
					onClick={() => selectAppointment(row.appointment_id)}
					className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
						active ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:bg-muted/50'
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
	};

	const addRxFromCatalog = (drugId) => {
		const d = drugCatalog.find((x) => x.id === drugId);
		if (!d) return;
		const line = drugCatalogToRxLine(d, 'rx');
		setPrescriptionLines((prev) => [...prev, { ...line, id: newId('rx') }]);
	};

	const applyRxTemplate = (templateId) => {
		const t = rxTemplates.find((x) => x.id === templateId);
		if (!t) return;
		const lines = Array.isArray(t.lines) ? t.lines : [];
		if (!lines.length) return;
		setPrescriptionLines((prev) => [
			...prev,
			...lines.map((l) => {
				const base = newRxLine({
					medication_name: l.medication_name || '',
					strength: l.strength || '',
					dose: l.dose || '',
					route: l.route || 'oral',
					frequency: l.frequency || '',
					duration_days: l.duration_days != null ? String(l.duration_days) : '',
					quantity: l.quantity != null ? String(l.quantity) : '',
					refills: l.refills != null ? String(l.refills) : '0',
					sig: l.sig || buildPrescriptionSig(l),
					catalog_id: l.catalog_id || null,
				});
				return { ...base, id: newId('rx') };
			}),
		]);
		toast.success(`Applied template: ${t.name}`);
	};

	const addLabFromCatalog = (labId) => {
		const t = labCatalog.find((x) => x.id === labId);
		if (!t) return;
		setLabOrders((prev) => [
			...prev,
			newLabLine({
				test_name: t.test_name,
				code: t.code || '',
				catalog_id: t.id,
			}),
		]);
	};

	const updateRxLine = (id, patch) => {
		setPrescriptionLines((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
	};

	const updateLabLine = (id, patch) => {
		setLabOrders((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
	};

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
						prescription_lines: prescriptionLines,
						lab_orders: labOrders,
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
						<CardDescription>Open visits and finalized encounters (most recent first within each group)</CardDescription>
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
								<div className="space-y-5">
									<div>
										<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
											To document
										</h3>
										{queueSections.open.length === 0 ? (
											<p className="text-xs text-muted-foreground py-1">No open visits in the queue.</p>
										) : (
											<ul className="space-y-2">{queueSections.open.map((row) => renderQueueRow(row))}</ul>
										)}
									</div>
									<div>
										<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
											Finalized
										</h3>
										{queueSections.finalized.length === 0 ? (
											<p className="text-xs text-muted-foreground py-1">No finalized encounters yet.</p>
										) : (
											<ul className="space-y-2">{queueSections.finalized.map((row) => renderQueueRow(row))}</ul>
										)}
									</div>
								</div>
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

								<div className="space-y-3 rounded-lg border p-4">
									<div className="flex items-center gap-2">
										<Pill className="h-4 w-4 text-muted-foreground" />
										<h3 className="text-sm font-semibold">Prescriptions</h3>
									</div>
									<p className="text-xs text-muted-foreground">
										Add medications for this visit. Manage your formulary and templates under{' '}
										<Link to="/provider/prescriptions" className="text-teal-600 underline font-medium">
											Prescriptions
										</Link>
										. You can edit any line below for this patient.
									</p>
									<div className="flex flex-wrap gap-2 items-end">
										{rxTemplates.length > 0 ? (
											<div className="min-w-[200px] flex-1 space-y-1">
												<Label className="text-xs">Apply template</Label>
												<Select
													value={templatePick}
													onValueChange={(v) => {
														if (v) applyRxTemplate(v);
														setTemplatePick('');
													}}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select template…" />
													</SelectTrigger>
													<SelectContent>
														{rxTemplates.map((t) => (
															<SelectItem key={t.id} value={t.id}>
																{t.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										) : null}
										<div className="min-w-[200px] flex-1 space-y-1">
											<Label className="text-xs">From formulary</Label>
											<Select
												onValueChange={(v) => {
													if (v) addRxFromCatalog(v);
												}}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select medication…" />
												</SelectTrigger>
												<SelectContent>
													{drugCatalog.map((d) => (
														<SelectItem key={d.id} value={d.id}>
															{d.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<Button type="button" variant="outline" size="sm" onClick={() => setPrescriptionLines((p) => [...p, newRxLine()])}>
											<Plus className="h-4 w-4 mr-1" />
											Blank line
										</Button>
									</div>
									{prescriptionLines.length === 0 ? (
										<p className="text-sm text-muted-foreground">No medications added.</p>
									) : (
										<div className="space-y-3 overflow-x-auto">
											{prescriptionLines.map((rx) => (
												<div key={rx.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
													<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
														<div className="space-y-1">
															<Label className="text-xs">Medication</Label>
															<Input
																value={rx.medication_name}
																onChange={(e) => updateRxLine(rx.id, { medication_name: e.target.value })}
															/>
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Strength</Label>
															<Input value={rx.strength} onChange={(e) => updateRxLine(rx.id, { strength: e.target.value })} />
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Dose / form</Label>
															<Input value={rx.dose} onChange={(e) => updateRxLine(rx.id, { dose: e.target.value })} />
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Route</Label>
															<Select
																value={rx.route || 'oral'}
																onValueChange={(v) => {
																	const next = { route: v };
																	updateRxLine(rx.id, {
																		...next,
																		sig: buildPrescriptionSig({ ...rx, ...next }),
																	});
																}}
															>
																<SelectTrigger>
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	{MEDICATION_ROUTE_OPTIONS.map((o) => (
																		<SelectItem key={o.value} value={o.value}>
																			{o.label}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
														</div>
														<div className="space-y-1 sm:col-span-2">
															<Label className="text-xs">Frequency</Label>
															<MedicationFrequencySelect
																value={rx.frequency}
																onChange={(v) => {
																	updateRxLine(rx.id, {
																		frequency: v,
																		sig: buildPrescriptionSig({ ...rx, frequency: v }),
																	});
																}}
															/>
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Duration (days)</Label>
															<Input
																inputMode="numeric"
																value={rx.duration_days}
																onChange={(e) => updateRxLine(rx.id, { duration_days: e.target.value })}
															/>
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Quantity</Label>
															<Input
																inputMode="numeric"
																value={rx.quantity}
																onChange={(e) => updateRxLine(rx.id, { quantity: e.target.value })}
															/>
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Refills</Label>
															<Input
																inputMode="numeric"
																value={rx.refills}
																onChange={(e) => updateRxLine(rx.id, { refills: e.target.value })}
															/>
														</div>
													</div>
													<div className="space-y-1">
														<Label className="text-xs">Sig (patient directions)</Label>
														<Textarea
															rows={2}
															className="resize-y text-sm"
															value={rx.sig}
															onChange={(e) => updateRxLine(rx.id, { sig: e.target.value })}
														/>
													</div>
													<div className="flex justify-end">
														<Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setPrescriptionLines((p) => p.filter((x) => x.id !== rx.id))}>
															<Trash2 className="h-4 w-4 mr-1" />
															Remove
														</Button>
													</div>
												</div>
											))}
										</div>
									)}
								</div>

								<div className="space-y-3 rounded-lg border p-4">
									<div className="flex items-center gap-2">
										<FlaskConical className="h-4 w-4 text-muted-foreground" />
										<h3 className="text-sm font-semibold">Laboratory orders</h3>
									</div>
									<p className="text-xs text-muted-foreground">
										Select tests from your catalog or add custom orders. Saved with the encounter.
									</p>
									<div className="flex flex-wrap gap-2 items-end">
										<div className="min-w-[200px] flex-1 space-y-1">
											<Label className="text-xs">From catalog</Label>
											<select
												className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
												defaultValue=""
												onChange={(e) => {
													const v = e.target.value;
													if (v) addLabFromCatalog(v);
													e.target.value = '';
												}}
											>
												<option value="">Select test…</option>
												{labCatalog.map((t) => (
													<option key={t.id} value={t.id}>
														{t.test_name}
														{t.code ? ` (${t.code})` : ''}
													</option>
												))}
											</select>
										</div>
										<Button type="button" variant="outline" size="sm" onClick={() => setLabOrders((p) => [...p, newLabLine()])}>
											<Plus className="h-4 w-4 mr-1" />
											Custom test
										</Button>
									</div>
									{labOrders.length === 0 ? (
										<p className="text-sm text-muted-foreground">No lab orders.</p>
									) : (
										<div className="space-y-2">
											{labOrders.map((lab) => (
												<div key={lab.id} className="flex flex-col sm:flex-row gap-2 sm:items-end rounded-md border p-2">
													<div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
														<div className="space-y-1">
															<Label className="text-xs">Test name</Label>
															<Input
																value={lab.test_name}
																onChange={(e) => updateLabLine(lab.id, { test_name: e.target.value })}
															/>
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Code</Label>
															<Input value={lab.code} onChange={(e) => updateLabLine(lab.id, { code: e.target.value })} />
														</div>
														<div className="space-y-1">
															<Label className="text-xs">Priority</Label>
															<select
																className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
																value={lab.priority}
																onChange={(e) => updateLabLine(lab.id, { priority: e.target.value })}
															>
																<option value="routine">Routine</option>
																<option value="stat">STAT</option>
															</select>
														</div>
													</div>
													<div className="flex-1 space-y-1">
														<Label className="text-xs">Clinical indication</Label>
														<Input
															value={lab.indication}
															onChange={(e) => updateLabLine(lab.id, { indication: e.target.value })}
														/>
													</div>
													<Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setLabOrders((p) => p.filter((x) => x.id !== lab.id))}>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
										</div>
									)}
								</div>

								<div className="rounded-lg border-2 border-slate-800 bg-white p-6 text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100">
									<p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Prescription preview</p>
									<div className="mt-4 font-serif text-sm leading-relaxed space-y-3">
										<div className="flex justify-between gap-4 border-b border-slate-300 pb-2 dark:border-slate-600">
											<div>
												<p className="font-semibold text-base">{patientName}</p>
												{patient?.date_of_birth ? <p className="text-xs">DOB: {formatDateShort(patient.date_of_birth)}</p> : null}
												{patient?.phone ? <p className="text-xs">Tel: {patient.phone}</p> : null}
											</div>
											<div className="text-right text-xs">
												<p>{formatDateShort(new Date().toISOString().slice(0, 10))}</p>
												{appointment?.confirmation_number ? <p>Ref: {appointment.confirmation_number}</p> : null}
											</div>
										</div>
										{prescriptionLines.filter((r) => String(r.medication_name || '').trim()).length === 0 ? (
											<p className="text-sm text-slate-500 italic">No medications to display.</p>
										) : (
											<table className="w-full text-left text-sm border-collapse">
												<thead>
													<tr className="border-b border-slate-300 dark:border-slate-600">
														<th className="py-2 pr-2 font-semibold">Medication</th>
														<th className="py-2 pr-2 font-semibold">Sig</th>
														<th className="py-2 pr-2 font-semibold w-16">Qty</th>
														<th className="py-2 font-semibold w-14">RF</th>
													</tr>
												</thead>
												<tbody>
													{prescriptionLines
														.filter((r) => String(r.medication_name || '').trim())
														.map((rx) => (
															<tr key={rx.id} className="border-b border-slate-200 dark:border-slate-800 align-top">
																<td className="py-2 pr-2">
																	<span className="font-medium">{rx.medication_name}</span>
																	{rx.strength ? <span className="block text-xs text-slate-600 dark:text-slate-400">{rx.strength}</span> : null}
																	{rx.dose ? <span className="block text-xs">{rx.dose}</span> : null}
																</td>
																<td className="py-2 pr-2 text-xs whitespace-pre-wrap">{rx.sig || `${rx.frequency || ''} ${rx.route ? `· ${rx.route}` : ''}`.trim() || '—'}</td>
																<td className="py-2 pr-2 text-xs">{rx.quantity || '—'}</td>
																<td className="py-2 text-xs">{rx.refills ?? '—'}</td>
															</tr>
														))}
												</tbody>
											</table>
										)}
										<div className="pt-4 border-t border-slate-300 text-xs dark:border-slate-600">
											<p className="font-semibold">{prescriberDisplay}</p>
											{currentUser?.npi ? <p>NPI: {currentUser.npi}</p> : null}
											<p className="text-slate-500 mt-1 dark:text-slate-400">Electronic signature on file after finalize.</p>
										</div>
									</div>
								</div>

								<Separator />

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
									<span className="text-xs text-muted-foreground self-center max-w-md text-right">
										{encounterStatus === 'finalized'
											? 'Marked finalized — the patient can open this visit under Consultations and complete lab or medication actions.'
											: 'Draft — save before the patient leaves, or finalize when complete so the patient sees the visit and action plan.'}
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
