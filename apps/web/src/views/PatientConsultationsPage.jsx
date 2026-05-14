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
		return (
			<div className="space-y-6 max-w-3xl mx-auto">
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
								<p className="text-sm mt-3">
									<span className="text-muted-foreground">Reason for visit: </span>
									{detail.appointment.reason}
								</p>
							) : null}
							{detail.encounter?.plan ? (
								<Card className="mt-4 border-border/60">
									<CardHeader className="py-3">
										<CardTitle className="text-base">Care plan notes</CardTitle>
										<CardDescription>Summary from your visit (not a full medical record).</CardDescription>
									</CardHeader>
									<CardContent className="pt-0 text-sm whitespace-pre-wrap text-muted-foreground">
										{detail.encounter.plan}
									</CardContent>
								</Card>
							) : null}
						</div>

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
									<p className="text-sm text-muted-foreground">No prescriptions or lab orders were attached to this visit.</p>
								) : (
									detail.action_items.map((item) => (
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
									))
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
