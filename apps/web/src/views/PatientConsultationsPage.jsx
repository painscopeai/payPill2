import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, CheckCircle2, CircleDashed } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

function vitalsEntries(vitals) {
	if (!vitals || typeof vitals !== 'object') return [];
	const labels = {
		bp_systolic: 'BP systolic',
		bp_diastolic: 'BP diastolic',
		heart_rate: 'Heart rate',
		temperature_c: 'Temperature (°C)',
		weight_kg: 'Weight (kg)',
		spo2: 'SpO₂ (%)',
	};
	return Object.entries(vitals)
		.filter(([, val]) => val != null && String(val).trim() !== '')
		.map(([key, val]) => [labels[key] || key.replace(/_/g, ' '), val]);
}

function SoapBlock({ title, text }) {
	const body = text != null && String(text).trim() ? String(text) : '—';
	return (
		<div className="rounded-lg border border-border/60 bg-card p-4">
			<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
			<p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{body}</p>
		</div>
	);
}

function actionSubtitle(item) {
	const p = item.payload && typeof item.payload === 'object' ? item.payload : {};
	if (item.item_type === 'prescription') {
		const parts = [];
		if (p.sig && String(p.sig).trim()) parts.push(String(p.sig).trim());
		else {
			const bits = [p.dose, p.frequency, p.route].filter((x) => x != null && String(x).trim());
			if (bits.length) parts.push(bits.map(String).join(' · '));
		}
		if (p.quantity != null && String(p.quantity).trim()) parts.push(`Qty ${p.quantity}`);
		if (p.refills != null && String(p.refills).trim()) parts.push(`Refills ${p.refills}`);
		if (p.duration_days != null && String(p.duration_days).trim()) parts.push(`${p.duration_days} days`);
		return parts.length ? parts.join(' · ') : null;
	}
	const parts = [];
	if (p.indication && String(p.indication).trim()) parts.push(String(p.indication).trim());
	if (p.priority && String(p.priority).trim()) parts.push(String(p.priority).trim());
	return parts.length ? parts.join(' · ') : null;
}

function formatVisitDate(d, t) {
	if (!d) return '—';
	try {
		const date = new Date(`${d}T12:00:00`);
		const dateStr = Number.isNaN(date.getTime()) ? String(d) : date.toLocaleDateString();
		const timeStr = t ? String(t).slice(0, 5) : '';
		return timeStr ? `${dateStr} · ${timeStr}` : dateStr;
	} catch {
		return String(d);
	}
}

function actionLabel(item) {
	const p = (item.payload && typeof item.payload === 'object' ? item.payload : {}) || {};
	if (item.item_type === 'prescription') {
		const name = String(p.medication_name || 'Medication').trim() || 'Medication';
		const strength = String(p.strength || '').trim();
		return strength ? `${name} (${strength})` : name;
	}
	const test = String(p.test_name || 'Lab test').trim() || 'Lab test';
	const code = String(p.code || '').trim();
	return code ? `${test} (${code})` : test;
}

export default function PatientConsultationsPage() {
	const { appointmentId } = useParams();

	const [listLoading, setListLoading] = useState(true);
	const [items, setItems] = useState([]);

	const [detailLoading, setDetailLoading] = useState(false);
	const [detail, setDetail] = useState(null);
	const [completingId, setCompletingId] = useState(null);

	const loadList = useCallback(async () => {
		setListLoading(true);
		try {
			const res = await apiServerClient.fetch('/patient/consultations');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Could not load consultations');
			setItems(Array.isArray(body.items) ? body.items : []);
		} catch (e) {
			console.error(e);
			toast.error(e.message || 'Could not load consultations');
			setItems([]);
		} finally {
			setListLoading(false);
		}
	}, []);

	const loadDetail = useCallback(async (id) => {
		setDetailLoading(true);
		setDetail(null);
		try {
			const res = await apiServerClient.fetch(`/patient/consultations/${encodeURIComponent(id)}`);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Could not load visit');
			setDetail(body);
		} catch (e) {
			console.error(e);
			toast.error(e.message || 'Could not load visit');
		} finally {
			setDetailLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!appointmentId) {
			void loadList();
		}
	}, [appointmentId, loadList]);

	useEffect(() => {
		if (appointmentId) {
			void loadDetail(appointmentId);
		}
	}, [appointmentId, loadDetail]);

	const markComplete = async (actionId) => {
		setCompletingId(actionId);
		try {
			const res = await apiServerClient.fetch(
				`/patient/consultations/actions/${encodeURIComponent(actionId)}/complete`,
				{ method: 'POST' },
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Could not update');
			toast.success(body.already ? 'Already completed.' : 'Marked complete and added to your Records.');
			if (appointmentId) await loadDetail(appointmentId);
			await loadList();
		} catch (e) {
			toast.error(e.message || 'Could not mark complete');
		} finally {
			setCompletingId(null);
		}
	};

	if (appointmentId) {
		const enc = detail?.encounter;
		const rxList = Array.isArray(enc?.prescription_lines)
			? enc.prescription_lines.filter((r) => r && String(r.medication_name || '').trim())
			: [];
		const labList = Array.isArray(enc?.lab_orders) ? enc.lab_orders.filter((r) => r && String(r.test_name || '').trim()) : [];
		const vitalPairs = enc?.vitals ? vitalsEntries(enc.vitals) : [];

		return (
			<div className="space-y-6 max-w-4xl mx-auto">
				<Helmet>
					<title>Consultation visit - PayPill</title>
				</Helmet>
				<div className="flex items-center gap-3">
					<Button type="button" variant="ghost" size="sm" className="gap-1 pl-0" asChild>
						<Link to="/patient/consultations">
							<ArrowLeft className="h-4 w-4" />
							All consultations
						</Link>
					</Button>
				</div>

				{detailLoading ? (
					<LoadingSpinner className="min-h-[200px]" />
				) : detail ? (
					<>
						<div>
							<h1 className="text-2xl font-bold tracking-tight">Consultation visit</h1>
							<p className="text-muted-foreground mt-1">
								{formatVisitDate(detail.appointment?.appointment_date, detail.appointment?.appointment_time)}
								{detail.appointment?.visit_label ? ` · ${detail.appointment.visit_label}` : ''}
							</p>
							<p className="text-sm text-muted-foreground mt-2">
								Provider: <span className="text-foreground font-medium">{detail.encounter?.provider_name}</span>
							</p>
							{detail.appointment?.reason ? (
								<p className="text-sm mt-2">
									<span className="text-muted-foreground">Reason for visit: </span>
									{detail.appointment.reason}
								</p>
							) : null}
							{detail.appointment?.confirmation_number ? (
								<p className="text-sm text-muted-foreground mt-1">
									Confirmation:{' '}
									<span className="text-foreground font-mono text-xs">{detail.appointment.confirmation_number}</span>
								</p>
							) : null}
							{detail.action_plan_message ? (
								<Alert className="mt-4 border-amber-500/40 bg-amber-500/5">
									<AlertDescription className="text-sm">{detail.action_plan_message}</AlertDescription>
								</Alert>
							) : null}
						</div>

						{vitalPairs.length > 0 ? (
							<Card>
								<CardHeader className="py-3">
									<CardTitle className="text-base">Vitals</CardTitle>
									<CardDescription>Recorded at your visit.</CardDescription>
								</CardHeader>
								<CardContent className="pt-0">
									<dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
										{vitalPairs.map(([label, val]) => (
											<div key={label} className="flex justify-between gap-4 rounded-md border border-border/50 px-3 py-2 bg-muted/20">
												<dt className="text-muted-foreground">{label}</dt>
												<dd className="font-medium tabular-nums">{String(val)}</dd>
											</div>
										))}
									</dl>
								</CardContent>
							</Card>
						) : null}

						<Card>
							<CardHeader className="py-3">
								<CardTitle className="text-base">Visit documentation</CardTitle>
								<CardDescription>Structured notes from your provider (SOAP).</CardDescription>
							</CardHeader>
							<CardContent className="pt-0 space-y-3">
								<SoapBlock title="Subjective" text={enc?.subjective} />
								<SoapBlock title="Objective" text={enc?.objective} />
								<SoapBlock title="Assessment" text={enc?.assessment} />
								<SoapBlock title="Plan" text={enc?.plan} />
								<SoapBlock title="Additional notes" text={enc?.additional_notes} />
							</CardContent>
						</Card>

						{rxList.length > 0 ? (
							<Card>
								<CardHeader className="py-3">
									<CardTitle className="text-base">Prescriptions</CardTitle>
									<CardDescription>Medications discussed or ordered at this visit.</CardDescription>
								</CardHeader>
								<CardContent className="pt-0 overflow-x-auto">
									<table className="w-full text-sm text-left">
										<thead className="text-xs text-muted-foreground uppercase border-b">
											<tr>
												<th className="py-2 pr-3 font-medium">Medication</th>
												<th className="py-2 pr-3 font-medium">Strength</th>
												<th className="py-2 pr-3 font-medium">Sig / directions</th>
												<th className="py-2 pr-3 font-medium">Qty</th>
												<th className="py-2 font-medium">RF</th>
											</tr>
										</thead>
										<tbody className="divide-y">
											{rxList.map((rx) => (
												<tr key={rx.id || `${rx.medication_name}-${rx.strength}`} className="align-top">
													<td className="py-2 pr-3 font-medium">
														{rx.medication_name}
														{rx.dose ? <span className="block text-xs text-muted-foreground font-normal">{rx.dose}</span> : null}
													</td>
													<td className="py-2 pr-3 text-muted-foreground">{rx.strength || '—'}</td>
													<td className="py-2 pr-3 text-xs whitespace-pre-wrap max-w-[220px]">
														{rx.sig && String(rx.sig).trim()
															? rx.sig
															: [rx.frequency, rx.route].filter(Boolean).join(' · ') || '—'}
													</td>
													<td className="py-2 pr-3 tabular-nums">{rx.quantity != null && rx.quantity !== '' ? rx.quantity : '—'}</td>
													<td className="py-2 tabular-nums">{rx.refills != null && rx.refills !== '' ? rx.refills : '—'}</td>
												</tr>
											))}
										</tbody>
									</table>
								</CardContent>
							</Card>
						) : null}

						{labList.length > 0 ? (
							<Card>
								<CardHeader className="py-3">
									<CardTitle className="text-base">Laboratory orders</CardTitle>
									<CardDescription>Tests ordered or recommended at this visit.</CardDescription>
								</CardHeader>
								<CardContent className="pt-0 overflow-x-auto">
									<table className="w-full text-sm text-left">
										<thead className="text-xs text-muted-foreground uppercase border-b">
											<tr>
												<th className="py-2 pr-3 font-medium">Test</th>
												<th className="py-2 pr-3 font-medium">Code</th>
												<th className="py-2 pr-3 font-medium">Priority</th>
												<th className="py-2 font-medium">Clinical indication</th>
											</tr>
										</thead>
										<tbody className="divide-y">
											{labList.map((lab) => (
												<tr key={lab.id || lab.test_name} className="align-top">
													<td className="py-2 pr-3 font-medium">{lab.test_name}</td>
													<td className="py-2 pr-3 text-muted-foreground">{lab.code || '—'}</td>
													<td className="py-2 pr-3 capitalize">{lab.priority || '—'}</td>
													<td className="py-2 text-muted-foreground">{lab.indication || '—'}</td>
												</tr>
											))}
										</tbody>
									</table>
								</CardContent>
							</Card>
						) : null}

						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Your action plan</CardTitle>
								<CardDescription>
									Mark each item when you have completed it (for example, picked up medication or had blood drawn). Completed
									items are saved under Records → Lab Results or Medications.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{!detail.action_items?.length ? (
									<p className="text-sm text-muted-foreground">
										{rxList.length === 0 && labList.length === 0
											? 'No prescriptions or lab orders were attached to this visit.'
											: 'Use the checklist below when available, or follow the prescriptions and lab tables above.'}
									</p>
								) : (
									detail.action_items.map((item) => {
										const sub = actionSubtitle(item);
										return (
										<div
											key={item.id}
											className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-4 bg-muted/20"
										>
											<div className="min-w-0 space-y-1">
												<div className="flex items-center gap-2 flex-wrap">
													<Badge variant="outline" className="capitalize">
														{item.item_type === 'prescription' ? 'Medication' : 'Lab'}
													</Badge>
													{item.status === 'completed' ? (
														<Badge className="bg-emerald-600/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30">
															Completed
														</Badge>
													) : (
														<Badge variant="secondary">Pending</Badge>
													)}
												</div>
												<p className="font-medium text-foreground">{actionLabel(item)}</p>
												{sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
											</div>
											{item.status === 'pending' ? (
												<Button
													type="button"
													size="sm"
													disabled={completingId === item.id}
													onClick={() => void markComplete(item.id)}
													className="shrink-0 gap-1.5"
												>
													{completingId === item.id ? (
														'…'
													) : (
														<>
															<CheckCircle2 className="h-4 w-4" />
															Mark completed
														</>
													)}
												</Button>
											) : (
												<span className="text-xs text-muted-foreground shrink-0">Logged in Records</span>
											)}
										</div>
										);
									})
								)}
							</CardContent>
						</Card>
					</>
				) : (
					<p className="text-sm text-muted-foreground">Visit not found or not finalized yet.</p>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-4xl mx-auto">
			<Helmet>
				<title>Consultation history - PayPill</title>
			</Helmet>
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Consultation history</h1>
				<p className="text-muted-foreground mt-1">
					After your provider finalizes a consultation or follow-up visit, it appears here with an action plan you can complete step by
					step.
				</p>
			</div>

			{listLoading ? (
				<LoadingSpinner className="min-h-[200px]" />
			) : items.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center text-muted-foreground text-sm">
						No finalized consultations yet. When your provider completes your visit notes, you will see visits here.
					</CardContent>
				</Card>
			) : (
				<ul className="space-y-3">
					{items.map((row) => (
						<li key={row.encounter_id}>
							<Card className="border-border/60 hover:border-teal-500/30 transition-colors">
								<CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
									<div className="flex gap-3 min-w-0">
										<div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
											<Calendar className="h-5 w-5 text-teal-700 dark:text-teal-300" />
										</div>
										<div className="min-w-0">
											<p className="font-medium truncate">{row.visit_label || 'Consultation'}</p>
											<p className="text-sm text-muted-foreground">
												{formatVisitDate(row.appointment_date, row.appointment_time)} · {row.provider_name}
											</p>
											{row.reason ? (
												<p className="text-xs text-muted-foreground mt-1 line-clamp-2">{row.reason}</p>
											) : null}
										</div>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										{row.action_plan_total > 0 ? (
											<Badge variant="outline" className="gap-1">
												{row.action_plan_pending > 0 ? (
													<>
														<CircleDashed className="h-3 w-3" />
														{row.action_plan_pending} pending
													</>
												) : (
													<>
														<CheckCircle2 className="h-3 w-3 text-emerald-600" />
														All done
													</>
												)}
											</Badge>
										) : null}
										<Button size="sm" asChild>
											<Link to={`/patient/consultations/${encodeURIComponent(row.appointment_id)}`}>Open</Link>
										</Button>
									</div>
								</CardContent>
							</Card>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
