import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Pill, Package, AlertTriangle, User } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { toast } from 'sonner';
import { formatPersonDisplayName } from '@/lib/providerPatientChartFormat';

function formatDateShort(value) {
	if (!value) return '—';
	const d = new Date(value);
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
	if (s === 'completed') return <Badge className="bg-emerald-600">Dispensed</Badge>;
	if (s === 'in_progress') return <Badge variant="secondary">In progress</Badge>;
	return <Badge variant="outline">Awaiting</Badge>;
}

const emptyForm = { drug_catalog_id: '', quantity_dispensed: '1', notes: '' };

export default function ProviderDispensingPage() {
	const [loading, setLoading] = useState(true);
	const [items, setItems] = useState([]);
	const [message, setMessage] = useState(null);
	const [drugs, setDrugs] = useState([]);
	const [filter, setFilter] = useState('open');
	const [activeRowId, setActiveRowId] = useState(null);
	const [form, setForm] = useState(emptyForm);
	const [dispensingId, setDispensingId] = useState(null);

	const loadQueue = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch(`/provider/service-queue?status=${encodeURIComponent(filter)}`);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load dispensing queue');
			setItems(Array.isArray(body.items) ? body.items : []);
			setMessage(body.message || null);
		} catch (e) {
			setItems([]);
			setMessage(e instanceof Error ? e.message : 'Failed to load');
		} finally {
			setLoading(false);
		}
	}, [filter]);

	const loadDrugs = useCallback(async () => {
		try {
			const res = await apiServerClient.fetch('/provider/catalog/drugs');
			const body = await res.json().catch(() => ({}));
			if (res.ok && Array.isArray(body.items)) {
				setDrugs(body.items.filter((d) => d.is_active !== false));
			}
		} catch {
			/* optional */
		}
	}, []);

	useEffect(() => {
		void loadQueue();
	}, [loadQueue]);

	useEffect(() => {
		void loadDrugs();
	}, [loadDrugs]);

	const beginEdit = (rowId) => {
		setActiveRowId(rowId);
		setForm(emptyForm);
	};

	const submitDispense = async (itemId) => {
		const drugId = form.drug_catalog_id.trim();
		const qty = Math.max(1, parseInt(form.quantity_dispensed, 10) || 1);
		if (!drugId) {
			toast.error('Select a catalog drug to deduct from inventory.');
			return;
		}
		setDispensingId(itemId);
		try {
			const res = await apiServerClient.fetch(`/provider/service-queue/${encodeURIComponent(itemId)}/dispense`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					drug_catalog_id: drugId,
					quantity_dispensed: qty,
					notes: form.notes.trim() || null,
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Dispense failed');
			toast.success('Medication dispensed — inventory updated.');
			setActiveRowId(null);
			setForm(emptyForm);
			await loadQueue();
			await loadDrugs();
		} catch (e) {
			toast.error(e.message || 'Dispense failed');
		} finally {
			setDispensingId(null);
		}
	};

	const openCount = filter === 'open' ? items.filter((i) => i.status !== 'completed').length : null;

	return (
		<div className="space-y-6 max-w-5xl">
			<Helmet>
				<title>Dispensing — Provider</title>
			</Helmet>
			<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
						<Pill className="h-8 w-8 text-violet-600" />
						Dispensing queue
					</h1>
					<p className="text-muted-foreground mt-1 max-w-2xl">
						Prescriptions routed from clinical consultations. Dispensing deducts stock and records a pharmacy movement.
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
						<Link to="/provider/inventory">
							<Package className="h-4 w-4 mr-1" />
							Inventory
						</Link>
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
					<CardTitle>Prescription fulfillment</CardTitle>
					<CardDescription>
						Match each order to a catalog SKU, confirm quantity, and dispense. Patient charts show profile only — clinical
						records stay with the doctor.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="py-12 flex justify-center">
							<LoadingSpinner />
						</div>
					) : items.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-10">
							{filter === 'open'
								? 'No prescriptions awaiting dispense. Orders appear here when a clinician finalizes a visit with medications.'
								: 'No completed dispensations in this view.'}
						</p>
					) : (
						<ul className="space-y-4">
							{items.map((row) => {
								const payload = row.payload || {};
								const medName = payload.medication_name || payload.name || 'Medication';
								const dosage = [payload.dosage, payload.frequency].filter(Boolean).join(' · ');
								const isOpen = row.status !== 'completed';
								const name = patientLabel(row.patient);
								const patientId = row.patient_user_id;
								const editing = activeRowId === row.id;

								return (
									<li key={row.id} className="rounded-lg border border-border/80 p-4 space-y-3 bg-card">
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div>
												<p className="font-semibold text-lg">{medName}</p>
												{dosage ? <p className="text-sm text-muted-foreground">{dosage}</p> : null}
												<p className="text-xs text-muted-foreground mt-1">
													Ordered {formatDateShort(row.created_at)}
													{payload.instructions ? ` · ${payload.instructions}` : ''}
												</p>
											</div>
											<div className="flex flex-col items-end gap-2">
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
											<p className="text-sm text-muted-foreground border-t pt-3">
												Dispensed {formatDateShort(row.fulfilled_at)}
												{row.quantity_dispensed != null ? ` · Qty ${row.quantity_dispensed}` : ''}
												{row.fulfillment_notes ? ` — ${row.fulfillment_notes}` : ''}
											</p>
										) : editing ? (
											<div className="border-t pt-3 grid gap-3 sm:grid-cols-2">
												<div className="space-y-1.5 sm:col-span-2">
													<Label>Catalog drug (inventory)</Label>
													<Select
														value={form.drug_catalog_id}
														onValueChange={(v) => setForm((f) => ({ ...f, drug_catalog_id: v }))}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select SKU to dispense" />
														</SelectTrigger>
														<SelectContent>
															{drugs.length === 0 ? (
																<SelectItem value="_none" disabled>
																	No drugs in catalog — add SKUs under Settings
																</SelectItem>
															) : (
																drugs.map((d) => (
																	<SelectItem key={d.id} value={d.id}>
																		{d.name}
																		{d.quantity_on_hand != null ? ` (${d.quantity_on_hand} on hand)` : ''}
																	</SelectItem>
																))
															)}
														</SelectContent>
													</Select>
												</div>
												<div className="space-y-1.5">
													<Label htmlFor={`qty-${row.id}`}>Quantity</Label>
													<Input
														id={`qty-${row.id}`}
														type="number"
														min={1}
														value={form.quantity_dispensed}
														onChange={(e) => setForm((f) => ({ ...f, quantity_dispensed: e.target.value }))}
													/>
												</div>
												<div className="space-y-1.5 sm:col-span-2">
													<Label>Notes (optional)</Label>
													<Textarea
														rows={2}
														placeholder="Batch, counseling, or handoff notes"
														value={form.notes}
														onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
													/>
												</div>
												<div className="sm:col-span-2 flex gap-2 justify-end">
													<Button variant="outline" onClick={() => setActiveRowId(null)}>
														Cancel
													</Button>
													<Button
														className="bg-violet-600 hover:bg-violet-700 text-white"
														disabled={dispensingId === row.id}
														onClick={() => void submitDispense(row.id)}
													>
														{dispensingId === row.id ? 'Dispensing…' : 'Dispense & update stock'}
													</Button>
												</div>
											</div>
										) : (
											<div className="border-t pt-3 flex justify-end">
												<Button
													className="bg-violet-600 hover:bg-violet-700 text-white"
													onClick={() => beginEdit(row.id)}
												>
													Start dispense
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
