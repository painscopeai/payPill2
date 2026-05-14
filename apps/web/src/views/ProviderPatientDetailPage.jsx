import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { toast } from 'sonner';
import { Calendar, FileText, Pill, FlaskConical, StickyNote, ClipboardList } from 'lucide-react';

function formatDate(value) {
	if (!value) return '—';
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function formatDateShort(value) {
	if (!value) return '—';
	const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(value) : new Date(value);
	return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

export default function ProviderPatientDetailPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [record, setRecord] = useState(null);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(null);
	const [notes, setNotes] = useState('');
	const [saving, setSaving] = useState(false);

	const loadRecord = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		setLoadError(null);
		try {
			const res = await apiServerClient.fetch(`/provider/patients/${encodeURIComponent(id)}`);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load patient');
			setRecord(body);
		} catch (e) {
			setLoadError(e.message || 'Failed to load');
			setRecord(null);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		void loadRecord();
	}, [loadRecord]);

	const save = async (e) => {
		e.preventDefault();
		if (!notes.trim()) return;
		setSaving(true);
		try {
			const res = await apiServerClient.fetch(`/provider/patients/${encodeURIComponent(id)}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notes: notes.trim() }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to save');
			toast.success('Clinical note saved.');
			setNotes('');
			await loadRecord();
		} catch (err) {
			toast.error(err.message || 'Failed to save');
		} finally {
			setSaving(false);
		}
	};

	const p = record?.profile || {};
	const cov = record?.coverage_summary;
	const displayName =
		[p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
		String(p.name || '').trim() ||
		String(p.email || '').trim() ||
		'Patient';

	return (
		<div className="space-y-6 max-w-5xl">
			<Helmet>
				<title>{displayName} — Provider chart</title>
			</Helmet>
			<Button variant="ghost" className="-ml-2 text-muted-foreground" onClick={() => navigate('/provider/patients')}>
				← Back to patients
			</Button>

			{loading ? (
				<LoadingSpinner />
			) : loadError ? (
				<p className="text-muted-foreground">{loadError}</p>
			) : !record ? (
				<p className="text-muted-foreground">Patient not found.</p>
			) : (
				<>
					<div>
						<h1 className="text-3xl font-bold tracking-tight">{displayName}</h1>
						<p className="text-sm text-muted-foreground mt-1">Full chart for care team review (read-only except clinical notes you add).</p>
					</div>

					<Tabs defaultValue="profile" className="w-full">
						<TabsList className="flex flex-wrap h-auto gap-1 p-1">
							<TabsTrigger value="profile">Profile</TabsTrigger>
							<TabsTrigger value="records">Records</TabsTrigger>
						</TabsList>

						<TabsContent value="profile" className="space-y-6 mt-4">
							<Card>
								<CardHeader>
									<CardTitle>Demographics</CardTitle>
									<CardDescription>From the patient profile</CardDescription>
								</CardHeader>
								<CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
									<p>
										<span className="text-muted-foreground">Email </span>
										{p.email || '—'}
									</p>
									<p>
										<span className="text-muted-foreground">Phone </span>
										{p.phone || '—'}
									</p>
									<p>
										<span className="text-muted-foreground">Date of birth </span>
										{p.date_of_birth || '—'}
									</p>
									<p>
										<span className="text-muted-foreground">Gender </span>
										{p.gender || '—'}
									</p>
								</CardContent>
							</Card>

							{cov ? (
								<Card className="border-primary/20 bg-muted/20">
									<CardHeader className="py-3">
										<CardTitle className="text-base">Coverage</CardTitle>
									</CardHeader>
									<CardContent className="text-sm space-y-1 pt-0">
										<p>
											<span className="text-muted-foreground">Type </span>
											{cov.coverage_type === 'employer' ? 'Employee' : 'Walk-in'}
										</p>
										<p>
											<span className="text-muted-foreground">Age / sex </span>
											{cov.age_years != null ? `${cov.age_years} yr` : '—'}
											{cov.sex_or_gender ? ` · ${cov.sex_or_gender}` : ''}
										</p>
										<p>
											<span className="text-muted-foreground">Insurance </span>
											{cov.insurance_label || '—'}
											{cov.member_id_display ? ` · Member ${cov.member_id_display}` : ''}
										</p>
										<p>
											<span className="text-muted-foreground">Employer </span>
											{cov.coverage_type === 'employer' ? cov.employer_name || '—' : 'Walk-in'}
										</p>
									</CardContent>
								</Card>
							) : null}

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<Calendar className="h-4 w-4" />
										Appointments with your practice
									</CardTitle>
									<CardDescription>Booked under your linked organization</CardDescription>
								</CardHeader>
								<CardContent>
									{(record.appointments || []).length === 0 ? (
										<p className="text-sm text-muted-foreground">No appointments on file.</p>
									) : (
										<ul className="divide-y rounded-md border">
											{record.appointments.map((a) => (
												<li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
													<span>
														{formatDateShort(a.appointment_date)} {a.appointment_time ? `· ${a.appointment_time}` : ''}
													</span>
													<span className="text-muted-foreground capitalize">{a.appointment_type || a.type || 'visit'}</span>
													<Badge variant="secondary" className="capitalize">
														{a.status || 'scheduled'}
													</Badge>
												</li>
											))}
										</ul>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="records" className="space-y-8 mt-4">
							<section>
								<h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
									<FileText className="h-5 w-5" />
									Patient-reported health records
								</h2>
								<Card>
									<CardContent className="pt-6">
										{(record.health_records || []).length === 0 ? (
											<p className="text-sm text-muted-foreground">No structured health records submitted.</p>
										) : (
											<div className="overflow-x-auto">
												<table className="w-full text-sm">
													<thead>
														<tr className="border-b text-left text-muted-foreground">
															<th className="pb-2 pr-3 font-medium">Type</th>
															<th className="pb-2 pr-3 font-medium">Title</th>
															<th className="pb-2 pr-3 font-medium">Date</th>
															<th className="pb-2 pr-3 font-medium">Facility</th>
															<th className="pb-2 font-medium">Notes</th>
														</tr>
													</thead>
													<tbody>
														{record.health_records.map((r) => (
															<tr key={r.id} className="border-b border-border/60 align-top">
																<td className="py-2 pr-3">
																	<Badge variant="outline" className="capitalize">
																		{r.record_type?.replace('_', ' ') || '—'}
																	</Badge>
																</td>
																<td className="py-2 pr-3 font-medium">{r.title}</td>
																<td className="py-2 pr-3 whitespace-nowrap">{formatDateShort(r.record_date)}</td>
																<td className="py-2 pr-3 text-muted-foreground">{r.provider_or_facility || '—'}</td>
																<td className="py-2 text-muted-foreground max-w-md whitespace-pre-wrap">{r.notes || '—'}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										)}
									</CardContent>
								</Card>
							</section>

							<section>
								<h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
									<ClipboardList className="h-5 w-5" />
									Onboarding & questionnaire
								</h2>
								<div className="space-y-3">
									{(record.onboarding_steps || []).length === 0 ? (
										<Card>
											<CardContent className="pt-6 text-sm text-muted-foreground">No onboarding responses stored.</CardContent>
										</Card>
									) : (
										record.onboarding_steps.map((s) => (
											<Card key={s.step}>
												<CardHeader className="py-3">
													<CardTitle className="text-sm">Step {s.step}</CardTitle>
													<CardDescription className="text-xs">Updated {formatDate(s.updated_at)}</CardDescription>
												</CardHeader>
												<CardContent className="pt-0">
													<pre className="text-xs overflow-auto max-h-72 rounded-md bg-muted/60 p-3 border">
														{JSON.stringify(s.data ?? {}, null, 2)}
													</pre>
												</CardContent>
											</Card>
										))
									)}
								</div>
							</section>

							<section>
								<h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
									<Pill className="h-5 w-5" />
									Medications
								</h2>
								<Card>
									<CardContent className="pt-6">
										{(record.prescriptions || []).length === 0 ? (
											<p className="text-sm text-muted-foreground">No prescriptions on file.</p>
										) : (
											<ul className="divide-y rounded-md border">
												{record.prescriptions.map((rx) => (
													<li key={rx.id} className="px-3 py-2 text-sm">
														<p className="font-medium">{rx.medication_name}</p>
														<p className="text-muted-foreground">
															{[rx.dosage, rx.frequency].filter(Boolean).join(' · ') || '—'}
														</p>
														<p className="text-xs text-muted-foreground mt-1 capitalize">
															{rx.status || 'active'} · prescribed {formatDateShort(rx.date_prescribed)}
														</p>
													</li>
												))}
											</ul>
										)}
									</CardContent>
								</Card>
							</section>

							<section>
								<h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
									<FlaskConical className="h-5 w-5" />
									Lab results
								</h2>
								<Card>
									<CardContent className="pt-6">
										{(record.lab_results || []).length === 0 ? (
											<p className="text-sm text-muted-foreground">No lab results on file.</p>
										) : (
											<div className="overflow-x-auto">
												<table className="w-full text-sm">
													<thead>
														<tr className="border-b text-left text-muted-foreground">
															<th className="pb-2 pr-3 font-medium">Test</th>
															<th className="pb-2 pr-3 font-medium">Value</th>
															<th className="pb-2 font-medium">Date</th>
														</tr>
													</thead>
													<tbody>
														{record.lab_results.map((lab) => (
															<tr key={lab.id} className="border-b border-border/60">
																<td className="py-2 pr-3">{lab.test_name}</td>
																<td className="py-2 pr-3">
																	{lab.result_value}
																	{lab.unit ? ` ${lab.unit}` : ''}
																</td>
																<td className="py-2 whitespace-nowrap">{formatDateShort(lab.test_date)}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										)}
									</CardContent>
								</Card>
							</section>

							<section>
								<h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
									<StickyNote className="h-5 w-5" />
									Clinical notes
								</h2>
								<Card>
									<CardContent className="pt-6">
										{(record.clinical_notes || []).length === 0 ? (
											<p className="text-sm text-muted-foreground">No clinical notes yet.</p>
										) : (
											<ul className="divide-y rounded-md border">
												{record.clinical_notes.map((n) => (
													<li key={n.id} className="px-3 py-3 first:pt-3">
														<div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
															<span className="font-medium text-foreground">{n.author_label}</span>
															<span>{formatDate(n.date_created)}</span>
														</div>
														<p className="mt-1 text-sm whitespace-pre-wrap border-l-2 pl-3 border-primary/30">{n.note_content}</p>
													</li>
												))}
											</ul>
										)}
									</CardContent>
								</Card>
							</section>
						</TabsContent>
					</Tabs>

					<Card>
						<CardHeader>
							<CardTitle>Add clinical note</CardTitle>
							<CardDescription>Appends to this patient&apos;s chart (visible to the care team).</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={save} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="note">Note</Label>
									<Textarea id="note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} required placeholder="Assessment, plan, or encounter summary…" />
								</div>
								<Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
									{saving ? 'Saving…' : 'Save to chart'}
								</Button>
							</form>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
