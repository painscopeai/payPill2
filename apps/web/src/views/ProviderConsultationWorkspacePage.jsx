import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { toast } from 'sonner';
import {
	Calendar,
	ExternalLink,
	FileText,
	User,
	Trash2,
	Plus,
	Pill,
	FlaskConical,
	Stethoscope,
	MessageSquare,
	ArrowLeft,
	Phone,
	Mail,
	X,
} from 'lucide-react';
import DataTable from '@/components/DataTable.jsx';
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
import SectionFulfillmentSelect from '@/components/provider/SectionFulfillmentSelect.jsx';
import {
	DEFAULT_SECTION_FULFILLMENT,
	parseSectionFulfillment,
	serializeSectionFulfillment,
	validateSectionFulfillmentForFinalize,
} from '@/lib/consultationFulfillment';

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
	const [prescriptionFulfillment, setPrescriptionFulfillment] = useState(() => ({ ...DEFAULT_SECTION_FULFILLMENT }));
	const [labFulfillment, setLabFulfillment] = useState(() => ({ ...DEFAULT_SECTION_FULFILLMENT }));
	const [pharmacyPartners, setPharmacyPartners] = useState([]);
	const [laboratoryPartners, setLaboratoryPartners] = useState([]);

	const [saving, setSaving] = useState(false);
	const [formularyPick, setFormularyPick] = useState('');
	const [templatePick, setTemplatePick] = useState('');
	const [queueFilter, setQueueFilter] = useState('all');
	const [viewMode, setViewMode] = useState('queue');
	const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
	/** When false on a finalized encounter, SOAP is read-only until provider clicks Edit Consultation. */
	const [encounterEditing, setEncounterEditing] = useState(true);
	const queueInitRef = useRef(false);
	/** Prevents URL-sync effect from fighting row clicks (re-selecting the previous appointment). */
	const lastSyncedAppointmentRef = useRef(null);

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
				const [dRes, tRes, lRes, phRes, labRes] = await Promise.all([
					apiServerClient.fetch('/provider/catalog/drugs'),
					apiServerClient.fetch('/provider/prescription-templates'),
					apiServerClient.fetch('/provider/catalog/labs'),
					apiServerClient.fetch('/provider/fulfillment-partners?kind=pharmacy'),
					apiServerClient.fetch('/provider/fulfillment-partners?kind=laboratory'),
				]);
				const dBody = await dRes.json().catch(() => ({}));
				const tBody = await tRes.json().catch(() => ({}));
				const lBody = await lRes.json().catch(() => ({}));
				const phBody = await phRes.json().catch(() => ({}));
				const labPartnersBody = await labRes.json().catch(() => ({}));
				if (cancelled) return;
				if (dRes.ok) setDrugCatalog(Array.isArray(dBody.items) ? dBody.items : []);
				if (tRes.ok) setRxTemplates(Array.isArray(tBody.items) ? tBody.items.filter((t) => t.is_active !== false) : []);
				if (lRes.ok) setLabCatalog(Array.isArray(lBody.items) ? lBody.items : []);
				if (phRes.ok) setPharmacyPartners(Array.isArray(phBody.items) ? phBody.items : []);
				if (labRes.ok) setLaboratoryPartners(Array.isArray(labPartnersBody.items) ? labPartnersBody.items : []);
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
			setPrescriptionFulfillment({ ...DEFAULT_SECTION_FULFILLMENT });
			setLabFulfillment({ ...DEFAULT_SECTION_FULFILLMENT });
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
		setPrescriptionFulfillment(parseSectionFulfillment(enc.prescription_fulfillment));
		setLabFulfillment(parseSectionFulfillment(enc.lab_fulfillment));
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
				const isFinalized = body.encounter?.status === 'finalized';
				setEncounterEditing(!isFinalized);
			} catch (e) {
				setDetailError(e.message || 'Failed to load');
				setAppointment(null);
				setPatient(null);
				applyEncounterPayload(null);
				setEncounterEditing(true);
			} finally {
				setDetailLoading(false);
			}
		},
		[applyEncounterPayload],
	);

	const selectQueueRow = useCallback(
		(row, { openEncounter = false } = {}) => {
			const id = row?.appointment_id;
			if (!id) return;
			lastSyncedAppointmentRef.current = id;
			setSelectedId(id);
			setViewMode(openEncounter ? 'encounter' : 'queue');
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.set('appointment', id);
					if (openEncounter) next.set('view', 'encounter');
					else next.delete('view');
					return next;
				},
				{ replace: true },
			);
			void loadDetail(id);
		},
		[loadDetail, setSearchParams],
	);

	const openEncounterForSelected = useCallback(() => {
		if (!selectedId) return;
		const row = items.find((i) => i.appointment_id === selectedId);
		if (row?.encounter_status === 'finalized') {
			setEncounterEditing(true);
		}
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set('appointment', selectedId);
				next.set('view', 'encounter');
				return next;
			},
			{ replace: true },
		);
		setViewMode('encounter');
	}, [selectedId, items, setSearchParams]);

	const backToQueue = useCallback(() => {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete('view');
				return next;
			},
			{ replace: true },
		);
		setViewMode('queue');
	}, [setSearchParams]);

	const clearQueueSelection = useCallback(() => {
		lastSyncedAppointmentRef.current = null;
		setSelectedId(null);
		setAppointment(null);
		setPatient(null);
		applyEncounterPayload(null);
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete('appointment');
				next.delete('view');
				return next;
			},
			{ replace: true },
		);
		setViewMode('queue');
	}, [applyEncounterPayload, setSearchParams]);

	const handleQueueRowClick = useCallback(
		(row) => {
			const id = row?.appointment_id;
			if (!id) return;
			if (String(selectedId) === String(id)) {
				clearQueueSelection();
				return;
			}
			selectQueueRow(row);
		},
		[selectedId, selectQueueRow, clearQueueSelection],
	);

	/** On first load without ?appointment=, start with a full-width table and no row selected. */
	useEffect(() => {
		if (listLoading || queueInitRef.current) return;
		queueInitRef.current = true;
		if (appointmentFromUrl) return;
		setSelectedId(null);
		setAppointment(null);
		setPatient(null);
		applyEncounterPayload(null);
	}, [listLoading, appointmentFromUrl, applyEncounterPayload]);

	/** Sync selection from URL only when the URL changes externally (back/forward, shared link)—not on row clicks. */
	useEffect(() => {
		if (listLoading) return;

		if (appointmentFromUrl && !items.some((i) => i.appointment_id === appointmentFromUrl)) {
			lastSyncedAppointmentRef.current = null;
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.delete('appointment');
					next.delete('view');
					return next;
				},
				{ replace: true },
			);
			setSelectedId(null);
			setAppointment(null);
			setPatient(null);
			applyEncounterPayload(null);
			return;
		}

		if (!appointmentFromUrl) {
			if (lastSyncedAppointmentRef.current) {
				lastSyncedAppointmentRef.current = null;
			}
			return;
		}

		if (appointmentFromUrl === lastSyncedAppointmentRef.current) return;

		lastSyncedAppointmentRef.current = appointmentFromUrl;
		const urlViewEncounter = searchParams.get('view') === 'encounter';
		setSelectedId(appointmentFromUrl);
		setViewMode(urlViewEncounter ? 'encounter' : 'queue');
		void loadDetail(appointmentFromUrl);
	}, [
		appointmentFromUrl,
		items,
		listLoading,
		searchParams,
		setSearchParams,
		loadDetail,
		applyEncounterPayload,
	]);

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

	const filteredQueueItems = useMemo(() => {
		if (queueFilter === 'open') return items.filter((i) => i.encounter_status !== 'finalized');
		if (queueFilter === 'finalized') return items.filter((i) => i.encounter_status === 'finalized');
		return items;
	}, [items, queueFilter]);

	const selectedQueueRow = useMemo(
		() => items.find((i) => i.appointment_id === selectedId) || null,
		[items, selectedId],
	);

	const queueCounts = useMemo(() => {
		const open = items.filter((i) => i.encounter_status !== 'finalized').length;
		const finalized = items.filter((i) => i.encounter_status === 'finalized').length;
		return { all: items.length, open, finalized };
	}, [items]);

	const encounterStatusBadge = (row) => {
		if (row.encounter_status === 'finalized') return <Badge className="font-normal">Finalized</Badge>;
		if (row.encounter_status === 'draft') return <Badge variant="outline" className="font-normal">Draft</Badge>;
		return (
			<Badge variant="secondary" className="font-normal text-amber-800 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-200">
				To document
			</Badge>
		);
	};

	const queueColumns = useMemo(
		() => [
			{
				header: 'Patient',
				cell: (row) => (
					<div className="min-w-[10rem]">
						<p className="font-medium text-foreground">{row.patient_name}</p>
						{row.patient_email ? (
							<p className="text-xs text-muted-foreground truncate max-w-[14rem]">{row.patient_email}</p>
						) : null}
					</div>
				),
			},
			{
				header: 'Visit',
				cell: (row) => <Badge variant="secondary" className="font-normal">{row.visit_label}</Badge>,
			},
			{
				header: 'Scheduled',
				cell: (row) => (
					<span className="whitespace-nowrap text-sm">
						{formatDateShort(row.appointment_date)}
						{row.appointment_time ? ` · ${formatTime(row.appointment_time)}` : ''}
					</span>
				),
			},
			{
				header: 'Booking',
				cell: (row) => <span className="capitalize text-sm text-muted-foreground">{row.status || 'scheduled'}</span>,
			},
			{
				header: 'Reason',
				cell: (row) => (
					<span className="text-sm text-muted-foreground line-clamp-2 max-w-[12rem]">{row.reason || '—'}</span>
				),
			},
		],
		[],
	);

	const previewPatient = patient || (selectedQueueRow
		? {
				id: selectedQueueRow.patient_user_id,
				first_name: null,
				last_name: null,
				email: selectedQueueRow.patient_email,
				phone: selectedQueueRow.patient_phone,
				date_of_birth: selectedQueueRow.patient_date_of_birth,
				gender: selectedQueueRow.patient_gender,
				name: selectedQueueRow.patient_name,
			}
		: null);

	const previewPatientName = useMemo(() => {
		if (!previewPatient) return selectedQueueRow?.patient_name || 'Patient';
		return (
			formatPersonDisplayName(
				[previewPatient.first_name, previewPatient.last_name].filter(Boolean).join(' ').trim() ||
					String(previewPatient.name || '').trim() ||
					String(previewPatient.email || '').trim() ||
					selectedQueueRow?.patient_name ||
					'Patient',
			) || 'Patient'
		);
	}, [previewPatient, selectedQueueRow]);

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

	const save = async (status, { closeAfterFinalize = false } = {}) => {
		if (!selectedId) return false;

		const rxHasLines = prescriptionLines.some((r) => String(r.medication_name || '').trim());
		const labHasLines = labOrders.some((r) => String(r.test_name || '').trim());
		if (status === 'finalized') {
			const rxErr = validateSectionFulfillmentForFinalize(prescriptionFulfillment, rxHasLines, 'prescriptions');
			if (rxErr) {
				toast.error(rxErr);
				return false;
			}
			const labErr = validateSectionFulfillmentForFinalize(labFulfillment, labHasLines, 'laboratory orders');
			if (labErr) {
				toast.error(labErr);
				return false;
			}
		}

		setSaving(true);
		try {
			const saveStatus =
				status === 'finalized'
					? 'finalized'
					: encounterStatus === 'finalized'
						? 'finalized'
						: 'draft';
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
						prescription_fulfillment: serializeSectionFulfillment(prescriptionFulfillment),
						lab_fulfillment: serializeSectionFulfillment(labFulfillment),
						status: saveStatus,
					}),
				},
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Save failed');
			if (body.encounter) applyEncounterPayload(body.encounter);
			if (status === 'finalized') {
				const routed = body.routed_to_portals;
				const rx = routed?.pharmacy_items ?? 0;
				const lab = routed?.laboratory_items ?? 0;
				if (rx > 0 || lab > 0) {
					const parts = [];
					if (rx > 0) parts.push(`${rx} prescription${rx === 1 ? '' : 's'} → pharmacy`);
					if (lab > 0) parts.push(`${lab} lab order${lab === 1 ? '' : 's'} → laboratory`);
					toast.success(`Encounter finalized. Routed: ${parts.join('; ')}.`);
				} else {
					toast.success('Encounter finalized.');
				}
				setEncounterEditing(false);
				setFinalizeDialogOpen(false);
				await loadList();
				if (closeAfterFinalize) {
					backToQueue();
				}
			} else {
				toast.success(encounterStatus === 'finalized' ? 'Consultation updated.' : 'Draft saved.');
				await loadList();
			}
			return true;
		} catch (e) {
			toast.error(e.message || 'Save failed');
			return false;
		} finally {
			setSaving(false);
		}
	};

	const isFinalizedEncounter = encounterStatus === 'finalized';
	const encounterFormLocked = isFinalizedEncounter && !encounterEditing;

	const rxCount = prescriptionLines.filter((l) => String(l.medication_name || '').trim()).length;
	const labCount = labOrders.filter((l) => String(l.test_name || '').trim()).length;

	return (
		<div className="flex flex-col gap-4 min-h-[calc(100dvh-6.5rem)] max-w-[100rem] w-full">
			<Helmet>
				<title>Consultations — PayPill</title>
			</Helmet>
			<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 shrink-0">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Consultation workspace</h1>
					<p className="text-muted-foreground mt-1 max-w-3xl text-sm">
						{viewMode === 'queue'
							? 'Click a visit in the queue to open the patient snapshot and start documentation.'
							: 'SOAP documentation for the selected visit. Return to the queue anytime.'}
					</p>
				</div>
				{viewMode === 'encounter' ? (
					<Button type="button" variant="outline" size="sm" onClick={backToQueue} className="shrink-0">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to queue
					</Button>
				) : null}
			</div>

			{message && !listError ? (
				<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100 shrink-0">
					{message}
				</div>
			) : null}

			{viewMode === 'queue' ? (
				<div className="flex flex-1 min-h-0 rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
					<div className="flex flex-col flex-1 min-w-0 min-h-0">
						<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-muted/20 shrink-0">
							<div className="flex items-center gap-2">
								<Calendar className="h-5 w-5 text-teal-600" />
								<div>
									<h2 className="font-semibold text-sm">Visit queue</h2>
									<p className="text-xs text-muted-foreground">
										{queueCounts.all} booking{queueCounts.all === 1 ? '' : 's'} · most recent first
									</p>
								</div>
							</div>
							<div className="flex flex-wrap gap-1.5">
								{[
									{ key: 'all', label: `All (${queueCounts.all})` },
									{ key: 'open', label: `To document (${queueCounts.open})` },
									{ key: 'finalized', label: `Finalized (${queueCounts.finalized})` },
								].map(({ key, label }) => (
									<Button
										key={key}
										type="button"
										size="sm"
										variant={queueFilter === key ? 'default' : 'outline'}
										className={queueFilter === key ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}
										onClick={() => setQueueFilter(key)}
									>
										{label}
									</Button>
								))}
							</div>
						</div>
						<div className="flex-1 min-h-0 p-4 pt-3">
							{listError ? (
								<p className="text-sm text-destructive">{listError}</p>
							) : (
								<DataTable
									columns={queueColumns}
									data={filteredQueueItems}
									loading={listLoading}
									stickyHeader
									className="h-full border-0 rounded-lg"
									getRowId={(row) => row.appointment_id}
									selectedRowId={selectedId}
									onRowClick={handleQueueRowClick}
									emptyMessage={
										items.length === 0
											? 'No consultation or follow-up bookings yet. When patients book those visit types, they appear here automatically.'
											: 'No visits match this filter.'
									}
								/>
							)}
						</div>
					</div>

					{selectedQueueRow ? (
						<aside className="w-full sm:w-[22rem] lg:w-[24rem] shrink-0 border-l border-border/80 bg-muted/10 flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-200">
							<div className="px-4 py-3 border-b border-border/60 bg-background/80 shrink-0 flex items-center justify-between gap-2">
								<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Patient snapshot</p>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-8 w-8 shrink-0"
									aria-label="Close preview"
									onClick={clearQueueSelection}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
							<ScrollArea className="flex-1 min-h-0">
								<div className="p-4 space-y-4">
									{detailLoading && !previewPatient ? (
										<div className="py-8 flex justify-center">
											<LoadingSpinner />
										</div>
									) : (
										<>
											<div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
												<div className="flex items-start gap-3">
													<div className="h-11 w-11 rounded-full bg-teal-600/10 flex items-center justify-center shrink-0">
														<User className="h-5 w-5 text-teal-700" />
													</div>
													<div className="min-w-0 flex-1">
														<p className="font-semibold text-lg leading-tight truncate">{previewPatientName}</p>
														<div className="flex flex-wrap gap-1.5 mt-1.5">
															{encounterStatusBadge(selectedQueueRow)}
															<Badge variant="secondary" className="font-normal">
																{selectedQueueRow.visit_label}
															</Badge>
														</div>
													</div>
												</div>
												<Separator />
												<dl className="grid gap-2.5 text-sm">
													{previewPatient?.date_of_birth || selectedQueueRow.patient_date_of_birth ? (
														<div className="flex justify-between gap-2">
															<dt className="text-muted-foreground">DOB</dt>
															<dd className="font-medium">
																{formatDateShort(
																	previewPatient?.date_of_birth || selectedQueueRow.patient_date_of_birth,
																)}
															</dd>
														</div>
													) : null}
													{previewPatient?.gender || selectedQueueRow.patient_gender ? (
														<div className="flex justify-between gap-2">
															<dt className="text-muted-foreground">Gender</dt>
															<dd className="font-medium capitalize">
																{previewPatient?.gender || selectedQueueRow.patient_gender}
															</dd>
														</div>
													) : null}
													{(previewPatient?.phone || selectedQueueRow.patient_phone) && (
														<div className="flex justify-between gap-2">
															<dt className="text-muted-foreground flex items-center gap-1">
																<Phone className="h-3.5 w-3.5" />
																Phone
															</dt>
															<dd className="font-medium text-right">
																{previewPatient?.phone || selectedQueueRow.patient_phone}
															</dd>
														</div>
													)}
													{(previewPatient?.email || selectedQueueRow.patient_email) && (
														<div className="flex justify-between gap-2">
															<dt className="text-muted-foreground flex items-center gap-1">
																<Mail className="h-3.5 w-3.5" />
																Email
															</dt>
															<dd className="font-medium text-right truncate max-w-[11rem]">
																{previewPatient?.email || selectedQueueRow.patient_email}
															</dd>
														</div>
													)}
												</dl>
											</div>

											<div className="rounded-lg border bg-card p-3 text-sm space-y-1.5">
												<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visit</p>
												<p className="font-medium">
													{formatDateShort(selectedQueueRow.appointment_date)}
													{selectedQueueRow.appointment_time
														? ` · ${formatTime(selectedQueueRow.appointment_time)}`
														: ''}
												</p>
												{selectedQueueRow.reason ? (
													<p className="text-muted-foreground">
														<span className="font-medium text-foreground">Reason: </span>
														{selectedQueueRow.reason}
													</p>
												) : null}
												{selectedQueueRow.confirmation_number ? (
													<p className="text-xs text-muted-foreground font-mono">
														#{selectedQueueRow.confirmation_number}
													</p>
												) : null}
											</div>

											<div className="space-y-2">
												<Button
													type="button"
													className="w-full bg-teal-600 hover:bg-teal-700 text-white"
													onClick={openEncounterForSelected}
												>
													<Stethoscope className="h-4 w-4 mr-2" />
													{selectedQueueRow.encounter_status === 'finalized'
														? 'Edit Consultation'
														: 'Document encounter'}
												</Button>
												{selectedQueueRow.patient_user_id ? (
													<Button type="button" variant="outline" className="w-full" asChild>
														<Link to={`/provider/patients/${encodeURIComponent(selectedQueueRow.patient_user_id)}`}>
															<ExternalLink className="h-4 w-4 mr-2" />
															Full patient chart
														</Link>
													</Button>
												) : null}
												{selectedQueueRow.patient_user_id ? (
													<Button type="button" variant="outline" className="w-full" asChild>
														<Link
															to={`/provider/messaging?patient=${encodeURIComponent(selectedQueueRow.patient_user_id)}`}
														>
															<MessageSquare className="h-4 w-4 mr-2" />
															Message patient
														</Link>
													</Button>
												) : null}
												<Button type="button" variant="ghost" className="w-full text-muted-foreground" asChild>
													<Link to="/provider/appointments">View schedule</Link>
												</Button>
											</div>
										</>
									)}
								</div>
							</ScrollArea>
						</aside>
					) : null}
				</div>
			) : (
				<Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
					<CardHeader className="shrink-0 pb-3">
						<CardTitle className="text-lg flex items-center gap-2">
							<FileText className="h-5 w-5 text-muted-foreground" />
							Encounter documentation
						</CardTitle>
						<CardDescription>Structured SOAP note for {previewPatientName}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6 overflow-y-auto flex-1 min-h-0 pb-8">
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

								<fieldset
									disabled={encounterFormLocked}
									className="min-w-0 border-0 p-0 m-0 space-y-6 disabled:opacity-100"
								>
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
										Add medications for this visit. Manage your formulary under{' '}
										<Link to="/provider/settings/catalog/drugs" className="text-teal-600 underline font-medium">
											Settings → Drug formulary
										</Link>
										. You can edit any line below for this patient.
									</p>
									<SectionFulfillmentSelect
										label="Pharmacy service provider"
										value={prescriptionFulfillment}
										onChange={setPrescriptionFulfillment}
										partners={pharmacyPartners}
										disabled={encounterFormLocked}
									/>
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
												value={formularyPick}
												onValueChange={(v) => {
													if (v) addRxFromCatalog(v);
													setFormularyPick('');
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
									<SectionFulfillmentSelect
										label="Laboratory service provider"
										value={labFulfillment}
										onChange={setLabFulfillment}
										partners={laboratoryPartners}
										disabled={encounterFormLocked}
									/>
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
								</fieldset>

								{encounterFormLocked ? (
									<div className="flex flex-wrap gap-2 pt-2 border-t">
										<Button
											type="button"
											className="bg-teal-600 hover:bg-teal-700 text-white"
											onClick={() => setEncounterEditing(true)}
										>
											<Stethoscope className="h-4 w-4 mr-2" />
											Edit Consultation
										</Button>
										<Button type="button" variant="outline" onClick={backToQueue}>
											Back to queue
										</Button>
										<span className="text-xs text-muted-foreground self-center max-w-md">
											This encounter is finalized. The patient can complete lab or medication actions from their
											portal.
										</span>
									</div>
								) : (
									<div className="flex flex-wrap gap-2 pt-2 border-t">
										{isFinalizedEncounter ? (
											<Button type="button" variant="secondary" disabled={saving} onClick={() => void save('draft')}>
												Save changes
											</Button>
										) : null}
										{!isFinalizedEncounter ? (
											<Button
												type="button"
												disabled={saving}
												className="bg-teal-600 hover:bg-teal-700 text-white"
												onClick={() => setFinalizeDialogOpen(true)}
											>
												Finalize encounter
											</Button>
										) : (
											<Button type="button" variant="outline" onClick={() => setEncounterEditing(false)}>
												Done editing
											</Button>
										)}
										<Button type="button" variant="ghost" onClick={backToQueue}>
											Back to queue
										</Button>
										<span className="text-xs text-muted-foreground self-center max-w-md">
											{isFinalizedEncounter
												? 'Update documentation for this finalized visit.'
												: 'Finalize when documentation is complete to release the patient action plan.'}
										</span>
									</div>
								)}
							</>
						) : items.length === 0 && !listLoading ? (
							<p className="text-sm text-muted-foreground">Nothing to show until a matching booking exists.</p>
						) : null}
					</CardContent>
				</Card>
			)}

			<AlertDialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Finalize this encounter?</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-2 text-sm text-muted-foreground">
								<p>
									Confirming will lock this visit for the patient action plan
									{rxCount > 0 || labCount > 0 ? ' and route orders to the appropriate portals' : ''}.
								</p>
								{rxCount > 0 ? (
									<p>
										<strong className="text-foreground">{rxCount}</strong> prescription
										{rxCount === 1 ? '' : 's'} will be sent to pharmacy.
									</p>
								) : null}
								{labCount > 0 ? (
									<p>
										<strong className="text-foreground">{labCount}</strong> lab order
										{labCount === 1 ? '' : 's'} will be sent to the laboratory.
									</p>
								) : null}
								<p>You can edit the consultation later from the queue if needed.</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={saving}>Go back to edit</AlertDialogCancel>
						<AlertDialogAction
							disabled={saving}
							className="bg-teal-600 hover:bg-teal-700 text-white"
							onClick={(e) => {
								e.preventDefault();
								void save('finalized', { closeAfterFinalize: true });
							}}
						>
							{saving ? 'Saving…' : 'Confirm & save'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
