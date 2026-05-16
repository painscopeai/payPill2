import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ProviderDataTable } from '@/components/provider/ProviderDataTable.jsx';
import { TableRowActionsMenu } from '@/components/TableRowActionsMenu.jsx';
import { MedicationFrequencySelect } from '@/components/provider/MedicationFrequencySelect.jsx';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import {
	MEDICATION_ROUTE_OPTIONS,
	buildPrescriptionSig,
	drugCatalogToRxLine,
	frequencyLabel,
} from '@/lib/prescriptionMedicationOptions';
import { useProviderPracticeContext } from '@/hooks/useProviderPracticeContext';

const API_DRUGS = '/provider/catalog/drugs?manage=1';
const API_TEMPLATES = '/provider/prescription-templates';

const BULK_TEMPLATE = `[
  { "name": "Metformin", "default_strength": "500 mg", "default_route": "oral", "default_frequency": "twice_daily", "default_duration_days": 90, "default_quantity": 180, "default_refills": 3, "notes": "" },
  { "name": "Lisinopril", "default_strength": "10 mg", "default_route": "oral", "default_frequency": "once_daily", "default_duration_days": 30, "default_quantity": 30, "default_refills": 5, "notes": "" }
]`;

const emptyMedForm = () => ({
	name: '',
	default_strength: '',
	default_route: 'oral',
	default_frequency: '',
	default_duration_days: '',
	default_quantity: '',
	default_refills: '0',
	notes: '',
	sort_order: '0',
});

function newTemplateLineId() {
	return typeof crypto !== 'undefined' && crypto.randomUUID
		? crypto.randomUUID()
		: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const emptyTemplateLine = () => ({
	id: newTemplateLineId(),
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
});

export default function ProviderPrescriptionsManager() {
	const { isPharmacy } = useProviderPracticeContext();
	const [medications, setMedications] = useState([]);
	const [templates, setTemplates] = useState([]);
	const [loadingMeds, setLoadingMeds] = useState(true);
	const [loadingTemplates, setLoadingTemplates] = useState(true);

	const [medDialogOpen, setMedDialogOpen] = useState(false);
	const [editingMedId, setEditingMedId] = useState(null);
	const [medForm, setMedForm] = useState(emptyMedForm);
	const [savingMed, setSavingMed] = useState(false);

	const [bulkJson, setBulkJson] = useState('');
	const [replaceAll, setReplaceAll] = useState(false);
	const [importing, setImporting] = useState(false);

	const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
	const [editingTemplateId, setEditingTemplateId] = useState(null);
	const [templateName, setTemplateName] = useState('');
	const [templateDescription, setTemplateDescription] = useState('');
	const [templateLines, setTemplateLines] = useState([emptyTemplateLine()]);
	const [savingTemplate, setSavingTemplate] = useState(false);

	const loadMedications = useCallback(async () => {
		setLoadingMeds(true);
		try {
			const res = await apiServerClient.fetch(API_DRUGS);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load medications');
			setMedications(Array.isArray(body.items) ? body.items : []);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to load medications');
			setMedications([]);
		} finally {
			setLoadingMeds(false);
		}
	}, []);

	const loadTemplates = useCallback(async () => {
		setLoadingTemplates(true);
		try {
			const res = await apiServerClient.fetch(API_TEMPLATES);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load templates');
			setTemplates(Array.isArray(body.items) ? body.items : []);
		} catch (e) {
			setTemplates([]);
		} finally {
			setLoadingTemplates(false);
		}
	}, []);

	useEffect(() => {
		void loadMedications();
		void loadTemplates();
	}, [loadMedications, loadTemplates]);

	const openMedCreate = () => {
		setEditingMedId(null);
		setMedForm(emptyMedForm());
		setMedDialogOpen(true);
	};

	const openMedEdit = (row) => {
		setEditingMedId(row.id);
		setMedForm({
			name: row.name || '',
			default_strength: row.default_strength || '',
			default_route: row.default_route || 'oral',
			default_frequency: row.default_frequency || '',
			default_duration_days: row.default_duration_days != null ? String(row.default_duration_days) : '',
			default_quantity: row.default_quantity != null ? String(row.default_quantity) : '',
			default_refills: row.default_refills != null ? String(row.default_refills) : '0',
			notes: row.notes || '',
			sort_order: row.sort_order != null ? String(row.sort_order) : '0',
		});
		setMedDialogOpen(true);
	};

	const saveMedication = async () => {
		setSavingMed(true);
		try {
			const payload = {
				name: medForm.name.trim(),
				default_strength: medForm.default_strength.trim() || null,
				default_route: medForm.default_route.trim() || null,
				default_frequency: medForm.default_frequency.trim() || null,
				default_duration_days: medForm.default_duration_days ? Number(medForm.default_duration_days) : null,
				default_quantity: medForm.default_quantity ? Number(medForm.default_quantity) : null,
				default_refills: medForm.default_refills ? Number(medForm.default_refills) : 0,
				notes: medForm.notes.trim() || null,
				sort_order: medForm.sort_order ? Number(medForm.sort_order) : 0,
			};
			if (!payload.name) {
				toast.error('Medication name is required');
				return;
			}
			if (editingMedId) {
				const res = await apiServerClient.fetch(`/provider/catalog/drugs/${encodeURIComponent(editingMedId)}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Save failed');
				toast.success('Medication updated');
			} else {
				const res = await apiServerClient.fetch('/provider/catalog/drugs', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ item: { ...payload, quantity_on_hand: 0, unit_price: 0, currency: 'USD' } }),
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Save failed');
				toast.success('Medication added');
			}
			setMedDialogOpen(false);
			await loadMedications();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Save failed');
		} finally {
			setSavingMed(false);
		}
	};

	const deleteMedication = async (id) => {
		if (!window.confirm('Delete this medication from your formulary?')) return;
		try {
			const res = await apiServerClient.fetch(`/provider/catalog/drugs/${encodeURIComponent(id)}`, { method: 'DELETE' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Delete failed');
			toast.success('Deleted');
			await loadMedications();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Delete failed');
		}
	};

	const runBulkImport = async () => {
		setImporting(true);
		try {
			const parsed = JSON.parse(bulkJson);
			if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
			const res = await apiServerClient.fetch('/provider/catalog/drugs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items: parsed, replace: replaceAll }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Import failed');
			toast.success(`Imported ${body.imported ?? parsed.length} medication(s)`);
			setBulkJson('');
			await loadMedications();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Import failed');
		} finally {
			setImporting(false);
		}
	};

	const openTemplateCreate = () => {
		setEditingTemplateId(null);
		setTemplateName('');
		setTemplateDescription('');
		setTemplateLines([emptyTemplateLine()]);
		setTemplateDialogOpen(true);
	};

	const openTemplateEdit = (row) => {
		setEditingTemplateId(row.id);
		setTemplateName(row.name || '');
		setTemplateDescription(row.description || '');
		const lines = Array.isArray(row.lines) ? row.lines : [];
		setTemplateLines(
			lines.length
				? lines.map((l) => ({ ...emptyTemplateLine(), ...l, id: l.id || newTemplateLineId() }))
				: [emptyTemplateLine()],
		);
		setTemplateDialogOpen(true);
	};

	const addDrugToTemplate = (drugId) => {
		const d = medications.find((x) => x.id === drugId);
		if (!d) return;
		setTemplateLines((prev) => [...prev, { ...drugCatalogToRxLine(d), id: newTemplateLineId() }]);
	};

	const updateTemplateLine = (lineId, patch) => {
		setTemplateLines((prev) =>
			prev.map((row) => {
				if (row.id !== lineId) return row;
				const next = { ...row, ...patch };
				if (patch.frequency !== undefined || patch.strength !== undefined || patch.route !== undefined || patch.dose !== undefined) {
					next.sig = buildPrescriptionSig(next);
				}
				return next;
			}),
		);
	};

	const saveTemplate = async () => {
		setSavingTemplate(true);
		try {
			const name = templateName.trim();
			if (!name) {
				toast.error('Template name is required');
				return;
			}
			const lines = templateLines
				.filter((l) => String(l.medication_name || '').trim())
				.map(({ id: _id, ...rest }) => rest);
			if (!lines.length) {
				toast.error('Add at least one medication to the template');
				return;
			}
			const payload = { name, description: templateDescription.trim() || null, lines };
			if (editingTemplateId) {
				const res = await apiServerClient.fetch(`${API_TEMPLATES}/${encodeURIComponent(editingTemplateId)}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Save failed');
				toast.success('Template updated');
			} else {
				const res = await apiServerClient.fetch(API_TEMPLATES, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Save failed');
				toast.success('Template created');
			}
			setTemplateDialogOpen(false);
			await loadTemplates();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Save failed');
		} finally {
			setSavingTemplate(false);
		}
	};

	const deleteTemplate = async (id) => {
		if (!window.confirm('Delete this prescription template?')) return;
		try {
			const res = await apiServerClient.fetch(`${API_TEMPLATES}/${encodeURIComponent(id)}`, { method: 'DELETE' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Delete failed');
			toast.success('Template deleted');
			await loadTemplates();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Delete failed');
		}
	};

	const medColumns = [
		{ key: 'name', label: 'Medication', sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
		{ key: 'default_strength', label: 'Strength', sortable: true, render: (row) => row.default_strength || '—' },
		{ key: 'default_route', label: 'Route', sortable: true, render: (row) => row.default_route || '—' },
		{
			key: 'default_frequency',
			label: 'Frequency',
			sortable: true,
			render: (row) => frequencyLabel(row.default_frequency) || row.default_frequency || '—',
		},
		{
			key: 'default_duration_days',
			label: 'Days',
			sortable: true,
			render: (row) => (row.default_duration_days != null ? row.default_duration_days : '—'),
		},
		{
			key: 'actions',
			label: '',
			sortable: false,
			className: 'w-[72px]',
			render: (row) => (
				<div className="flex justify-end">
					<TableRowActionsMenu
						items={[
							{ label: 'Edit', icon: Pencil, onClick: () => openMedEdit(row) },
							{
								label: 'Delete',
								icon: Trash2,
								onClick: () => void deleteMedication(row.id),
								destructive: true,
								separatorBefore: true,
							},
						]}
					/>
				</div>
			),
		},
	];

	const templateColumns = [
		{ key: 'name', label: 'Template', sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
		{
			key: 'lines',
			label: 'Medications',
			sortable: false,
			render: (row) => {
				const lines = Array.isArray(row.lines) ? row.lines : [];
				return (
					<span className="text-sm text-muted-foreground">
						{lines.length ? lines.map((l) => l.medication_name).filter(Boolean).join(', ') : '—'}
					</span>
				);
			},
		},
		{
			key: 'actions',
			label: '',
			sortable: false,
			className: 'w-[72px]',
			render: (row) => (
				<div className="flex justify-end">
					<TableRowActionsMenu
						items={[
							{ label: 'Edit', icon: Pencil, onClick: () => openTemplateEdit(row) },
							{
								label: 'Delete',
								icon: Trash2,
								onClick: () => void deleteTemplate(row.id),
								destructive: true,
								separatorBefore: true,
							},
						]}
					/>
				</div>
			),
		},
	];

	return (
		<div className="space-y-8 w-full max-w-6xl">
			<Helmet>
				<title>Prescriptions — Provider</title>
			</Helmet>

			<div>
				<h1 className="text-3xl font-bold tracking-tight">Prescriptions</h1>
				<p className="text-muted-foreground mt-1 max-w-2xl">
					Build your medication formulary and predefined prescription templates. During consultations, select
					medications or apply a template, then adjust dose, strength, and frequency for each patient.
				</p>
				{isPharmacy ? (
					<p className="text-sm text-muted-foreground mt-2">
						Stock levels and pricing are managed in{' '}
						<Link to="/provider/inventory" className="text-teal-600 font-medium underline">
							Inventory
						</Link>
						.
					</p>
				) : null}
			</div>

			<Tabs defaultValue="medications" className="w-full">
				<TabsList>
					<TabsTrigger value="medications">Medications</TabsTrigger>
					<TabsTrigger value="templates">Prescription templates</TabsTrigger>
				</TabsList>

				<TabsContent value="medications" className="space-y-6 mt-6">
					<Card>
						<CardHeader className="flex flex-row items-start justify-between gap-4">
							<div>
								<CardTitle>Medication formulary</CardTitle>
								<CardDescription>Drugs available when prescribing during a consultation.</CardDescription>
							</div>
							<Button type="button" onClick={openMedCreate}>
								<Plus className="h-4 w-4 mr-1.5" />
								Add medication
							</Button>
						</CardHeader>
						<CardContent>
							<ProviderDataTable
								columns={medColumns}
								data={medications}
								isLoading={loadingMeds}
								emptyMessage="No medications yet. Add your first drug to the formulary."
								getRowId={(r) => r.id}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Bulk import (JSON)</CardTitle>
							<CardDescription>Paste a JSON array to append or replace your formulary.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									const blob = new Blob([BULK_TEMPLATE], { type: 'application/json' });
									const url = URL.createObjectURL(blob);
									const a = document.createElement('a');
									a.href = url;
									a.download = 'medication-formulary-template.json';
									a.click();
									URL.revokeObjectURL(url);
								}}
							>
								<Download className="h-4 w-4 mr-1.5" />
								Download template
							</Button>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" checked={replaceAll} onChange={(e) => setReplaceAll(e.target.checked)} />
								Replace entire formulary before import
							</label>
							<Textarea rows={6} value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} placeholder="[ { ... }, { ... } ]" />
							<Button type="button" disabled={importing || !bulkJson.trim()} onClick={() => void runBulkImport()}>
								{importing ? 'Importing…' : 'Import JSON'}
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="templates" className="space-y-6 mt-6">
					<Card>
						<CardHeader className="flex flex-row items-start justify-between gap-4">
							<div>
								<CardTitle>Prescription templates</CardTitle>
								<CardDescription>
									Named multi-drug regimens you can apply during a consultation and edit per patient.
								</CardDescription>
							</div>
							<Button type="button" onClick={openTemplateCreate}>
								<Plus className="h-4 w-4 mr-1.5" />
								New template
							</Button>
						</CardHeader>
						<CardContent>
							<ProviderDataTable
								columns={templateColumns}
								data={templates}
								isLoading={loadingTemplates}
								emptyMessage="No templates yet. Create a predefined prescription to use during visits."
								getRowId={(r) => r.id}
							/>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<Dialog open={medDialogOpen} onOpenChange={setMedDialogOpen}>
				<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{editingMedId ? 'Edit medication' : 'Add medication'}</DialogTitle>
						<DialogDescription>Defaults are applied when this drug is added during a consultation.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div className="space-y-1">
							<Label>Name *</Label>
							<Input value={medForm.name} onChange={(e) => setMedForm((f) => ({ ...f, name: e.target.value }))} />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label>Strength</Label>
								<Input
									value={medForm.default_strength}
									onChange={(e) => setMedForm((f) => ({ ...f, default_strength: e.target.value }))}
								/>
							</div>
							<div className="space-y-1">
								<Label>Route</Label>
								<Select value={medForm.default_route} onValueChange={(v) => setMedForm((f) => ({ ...f, default_route: v }))}>
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
						</div>
						<div className="space-y-1">
							<Label>Frequency</Label>
							<MedicationFrequencySelect
								value={medForm.default_frequency}
								onChange={(v) => setMedForm((f) => ({ ...f, default_frequency: v }))}
							/>
						</div>
						<div className="grid grid-cols-3 gap-3">
							<div className="space-y-1">
								<Label>Duration (days)</Label>
								<Input
									inputMode="numeric"
									value={medForm.default_duration_days}
									onChange={(e) => setMedForm((f) => ({ ...f, default_duration_days: e.target.value }))}
								/>
							</div>
							<div className="space-y-1">
								<Label>Quantity</Label>
								<Input
									inputMode="numeric"
									value={medForm.default_quantity}
									onChange={(e) => setMedForm((f) => ({ ...f, default_quantity: e.target.value }))}
								/>
							</div>
							<div className="space-y-1">
								<Label>Refills</Label>
								<Input
									inputMode="numeric"
									value={medForm.default_refills}
									onChange={(e) => setMedForm((f) => ({ ...f, default_refills: e.target.value }))}
								/>
							</div>
						</div>
						<div className="space-y-1">
							<Label>Notes</Label>
							<Input value={medForm.notes} onChange={(e) => setMedForm((f) => ({ ...f, notes: e.target.value }))} />
						</div>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setMedDialogOpen(false)}>
							Cancel
						</Button>
						<Button type="button" disabled={savingMed} onClick={() => void saveMedication()}>
							{savingMed ? 'Saving…' : 'Save'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
				<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{editingTemplateId ? 'Edit template' : 'New prescription template'}</DialogTitle>
						<DialogDescription>Define medications with default dosing. Clinicians can edit lines during the visit.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label>Template name *</Label>
								<Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
							</div>
							<div className="space-y-1">
								<Label>Description</Label>
								<Input value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} />
							</div>
						</div>
						<div className="flex flex-wrap gap-2 items-end">
							<div className="min-w-[200px] flex-1 space-y-1">
								<Label className="text-xs">Add from formulary</Label>
								<Select onValueChange={(v) => v && addDrugToTemplate(v)}>
									<SelectTrigger>
										<SelectValue placeholder="Select medication…" />
									</SelectTrigger>
									<SelectContent>
										{medications.map((d) => (
											<SelectItem key={d.id} value={d.id}>
												{d.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<Button type="button" variant="outline" size="sm" onClick={() => setTemplateLines((p) => [...p, emptyTemplateLine()])}>
								<Plus className="h-4 w-4 mr-1" />
								Blank line
							</Button>
						</div>
						<div className="space-y-3">
							{templateLines.map((line) => (
								<div key={line.id} className="rounded-md border p-3 space-y-2 bg-muted/20">
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
										<div className="space-y-1">
											<Label className="text-xs">Medication *</Label>
											<Input
												value={line.medication_name}
												onChange={(e) => updateTemplateLine(line.id, { medication_name: e.target.value })}
											/>
										</div>
										<div className="space-y-1">
											<Label className="text-xs">Strength</Label>
											<Input value={line.strength} onChange={(e) => updateTemplateLine(line.id, { strength: e.target.value })} />
										</div>
										<div className="space-y-1">
											<Label className="text-xs">Dose / form</Label>
											<Input value={line.dose} onChange={(e) => updateTemplateLine(line.id, { dose: e.target.value })} />
										</div>
										<div className="space-y-1">
											<Label className="text-xs">Route</Label>
											<Select value={line.route || 'oral'} onValueChange={(v) => updateTemplateLine(line.id, { route: v })}>
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
												value={line.frequency}
												onChange={(v) => updateTemplateLine(line.id, { frequency: v })}
											/>
										</div>
										<div className="space-y-1">
											<Label className="text-xs">Duration (days)</Label>
											<Input
												inputMode="numeric"
												value={line.duration_days}
												onChange={(e) => updateTemplateLine(line.id, { duration_days: e.target.value })}
											/>
										</div>
										<div className="space-y-1">
											<Label className="text-xs">Quantity</Label>
											<Input
												inputMode="numeric"
												value={line.quantity}
												onChange={(e) => updateTemplateLine(line.id, { quantity: e.target.value })}
											/>
										</div>
										<div className="space-y-1">
											<Label className="text-xs">Refills</Label>
											<Input
												inputMode="numeric"
												value={line.refills}
												onChange={(e) => updateTemplateLine(line.id, { refills: e.target.value })}
											/>
										</div>
									</div>
									<div className="space-y-1">
										<Label className="text-xs">Sig</Label>
										<Input value={line.sig} onChange={(e) => updateTemplateLine(line.id, { sig: e.target.value })} />
									</div>
									<div className="flex justify-end">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="text-destructive"
											onClick={() => setTemplateLines((p) => p.filter((x) => x.id !== line.id))}
										>
											<Trash2 className="h-4 w-4 mr-1" />
											Remove line
										</Button>
									</div>
								</div>
							))}
						</div>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
							Cancel
						</Button>
						<Button type="button" disabled={savingTemplate} onClick={() => void saveTemplate()}>
							{savingTemplate ? 'Saving…' : 'Save template'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
