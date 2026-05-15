import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import ProviderOnboardingStepCard from '@/components/provider/ProviderOnboardingStepCard.jsx';
import ProviderRecordsPasswordDialog from '@/components/provider/ProviderRecordsPasswordDialog.jsx';
import { formatPersonDisplayName } from '@/lib/providerPatientChartFormat';
import { useAuth } from '@/contexts/AuthContext';
import {
	clearRecordsToken,
	isValidRecordsPayload,
	readStoredRecordsToken,
	storeRecordsToken,
} from '@/lib/providerRecordsAccess';

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

const EMPTY_RECORDS = {
	health_records: [],
	onboarding_steps: [],
	prescriptions: [],
	lab_results: [],
	clinical_notes: [],
};

export default function ProviderPatientDetailPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { currentUser } = useAuth();
	const providerId = currentUser?.id;
	const [record, setRecord] = useState(null);
	const [recordsUnlocked, setRecordsUnlocked] = useState(false);
	const [activeTab, setActiveTab] = useState('profile');
	const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
	const [recordsLoading, setRecordsLoading] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(null);
	const [notes, setNotes] = useState('');
	const [saving, setSaving] = useState(false);
	const recordsRestoreKeyRef = useRef(null);

	const loadRecord = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		setLoadError(null);
		setRecordsUnlocked(false);
		setActiveTab('profile');
		recordsRestoreKeyRef.current = null;
		try {
			const res = await apiServerClient.fetch(
				`/provider/patients/${encodeURIComponent(id)}?view=profile`,
			);
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

	const applyRecordsPayload = useCallback((body) => {
		setRecord((prev) => ({
			...(prev || {}),
			health_records: body.health_records || [],
			onboarding_steps: body.onboarding_steps || [],
			prescriptions: body.prescriptions || [],
			lab_results: body.lab_results || [],
			clinical_notes: body.clinical_notes || [],
			records_access_granted: true,
		}));
		setRecordsUnlocked(true);
	}, []);

	const loadRecordsBundle = useCallback(
		async (token) => {
			if (!id || !providerId || !token) return false;
			setRecordsLoading(true);
			try {
				const q = new URLSearchParams({
					view: 'records',
					records_access_token: token,
				});
				const res = await apiServerClient.fetch(
					`/provider/patients/${encodeURIComponent(id)}?${q.toString()}`,
					{ headers: { 'X-Provider-Records-Token': token } },
				);
				const body = await res.json().catch(() => ({}));
				if (!res.ok) {
					if (body.code === 'RECORDS_AUTH_REQUIRED') {
						clearRecordsToken(providerId, id);
					}
					throw new Error(body.error || 'Failed to load records');
				}
				if (!isValidRecordsPayload(body)) {
					throw new Error('Records could not be loaded. Please try again.');
				}
				applyRecordsPayload(body);
				storeRecordsToken(providerId, id, token);
				return true;
			} catch (e) {
				toast.error(e.message || 'Failed to load records');
				setRecordsUnlocked(false);
				return false;
			} finally {
				setRecordsLoading(false);
			}
		},
		[id, providerId, applyRecordsPayload],
	);

	useEffect(() => {
		void loadRecord();
	}, [loadRecord]);

	/** Restore 30-min records session once per patient (avoid re-fetch loop when record state updates). */
	useEffect(() => {
		if (!id || !providerId || loading) return;
		const restoreKey = `${providerId}:${id}`;
		if (recordsRestoreKeyRef.current === restoreKey) return;
		const stored = readStoredRecordsToken(providerId, id);
		if (!stored) return;
		recordsRestoreKeyRef.current = restoreKey;
		void loadRecordsBundle(stored);
	}, [id, providerId, loading, loadRecordsBundle]);

	const handleTabChange = (value) => {
		if (value === 'records') {
			if (recordsLoading) {
				setActiveTab('records');
				return;
			}
			if (recordsUnlocked) {
				setActiveTab('records');
				return;
			}
			const stored = providerId ? readStoredRecordsToken(providerId, id) : null;
			if (stored) {
				setActiveTab('records');
				void loadRecordsBundle(stored).then((ok) => {
					if (!ok) setPasswordDialogOpen(true);
				});
				return;
			}
			setPasswordDialogOpen(true);
			return;
		}
		setActiveTab(value);
	};

	const handleRecordsUnlocked = async (token) => {
		const ok = await loadRecordsBundle(token);
		if (ok) setActiveTab('records');
	};

	/** Breadcrumb in `ProviderLayout` reads this when the route is `/provider/patients/:id`. */
	useEffect(() => {
		if (!id || !record?.profile) return;
		const p0 = record.profile;
		const label =
			formatPersonDisplayName(
				[p0.first_name, p0.last_name].filter(Boolean).join(' ').trim() ||
					String(p0.name || '').trim() ||
					String(p0.email || '').trim() ||
					'Patient',
			) || 'Patient';
		try {
			sessionStorage.setItem(`paypill_provider_chart_bc_${id}`, label);
			window.dispatchEvent(new CustomEvent('paypill-provider-chart-bc'));
		} catch {
			/* private mode / SSR */
		}
	}, [id, record]);

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
			const stored = providerId ? readStoredRecordsToken(providerId, id) : null;
			if (stored) await loadRecordsBundle(stored);
		} catch (err) {
			toast.error(err.message || 'Failed to save');
		} finally {
			setSaving(false);
		}
	};

	const p = record?.profile || {};
	const cov = record?.coverage_summary;
	const chartRecords = recordsUnlocked
		? {
				health_records: record?.health_records || [],
				onboarding_steps: record?.onboarding_steps || [],
				prescriptions: record?.prescriptions || [],
				lab_results: record?.lab_results || [],
				clinical_notes: record?.clinical_notes || [],
			}
		: EMPTY_RECORDS;
	const displayName = formatPersonDisplayName(
		[p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
			String(p.name || '').trim() ||
			String(p.email || '').trim() ||
			'Patient',
	);

	return (
		<div className="space-y-8 max-w-5xl">
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
					<div className="border-b border-border/60 pb-6">
						<h1 className="text-3xl font-semibold tracking-tight text-balance">{displayName}</h1>
						<p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
							Chart review: demographics and coverage on <span className="font-medium text-foreground">Profile</span>; patient-reported
							history, vitals, medications, labs, and notes on <span className="font-medium text-foreground">Records</span> (password
							required). Add encounter notes below—everything else is read-only.
						</p>
					</div>

					<ProviderRecordsPasswordDialog
						open={passwordDialogOpen}
						onOpenChange={setPasswordDialogOpen}
						patientId={id}
						onUnlocked={handleRecordsUnlocked}
					/>

					<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
						<TabsList className="flex flex-wrap h-auto gap-1 p-1 w-full sm:w-auto">
							<TabsTrigger value="profile" className="min-w-[8rem]">
								Profile
							</TabsTrigger>
							<TabsTrigger value="records" className="min-w-[8rem]">
								Records
							</TabsTrigger>
						</TabsList>

						<TabsContent value="profile" className="space-y-6 mt-4">
							<Card className="shadow-sm">
								<CardHeader>
									<CardTitle className="text-lg">Demographics</CardTitle>
									<CardDescription>Account profile (not the same as the health questionnaire on the Records tab).</CardDescription>
								</CardHeader>
								<CardContent>
									<dl className="grid gap-4 sm:grid-cols-2">
										{[
											['Email', p.email],
											['Phone', p.phone],
											['Date of birth', p.date_of_birth ? formatDateShort(p.date_of_birth) : p.date_of_birth],
											['Gender', p.gender],
										].map(([label, val]) => (
											<div key={label} className="space-y-1">
												<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
												<dd className="text-sm font-medium">{val || '—'}</dd>
											</div>
										))}
									</dl>
								</CardContent>
							</Card>

							{cov ? (
								<Card className="border-teal-500/20 bg-gradient-to-br from-teal-500/5 via-muted/20 to-transparent shadow-sm">
									<CardHeader className="pb-2">
										<CardTitle className="text-lg">Coverage & billing</CardTitle>
										<CardDescription>How this patient is covered for visits and claims.</CardDescription>
									</CardHeader>
									<CardContent>
										<dl className="grid gap-3 sm:grid-cols-2 text-sm">
											<div className="space-y-1">
												<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Coverage type</dt>
												<dd className="font-medium">{cov.coverage_type === 'employer' ? 'Employee' : 'Walk-in'}</dd>
											</div>
											<div className="space-y-1">
												<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Age / sex</dt>
												<dd>
													{cov.age_years != null ? `${cov.age_years} yr` : '—'}
													{cov.sex_or_gender ? ` · ${cov.sex_or_gender}` : ''}
												</dd>
											</div>
											<div className="space-y-1 sm:col-span-2">
												<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Insurance</dt>
												<dd>
													{cov.insurance_label || '—'}
													{cov.member_id_display ? ` · Member ${cov.member_id_display}` : ''}
												</dd>
											</div>
											<div className="space-y-1 sm:col-span-2">
												<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Employer</dt>
												<dd>{cov.coverage_type === 'employer' ? cov.employer_name || '—' : 'Walk-in (no employer roster)'}</dd>
											</div>
										</dl>
									</CardContent>
								</Card>
							) : null}

							<Card className="shadow-sm">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-lg">
										<Calendar className="h-5 w-5 text-teal-600" />
										Appointments with your practice
									</CardTitle>
									<CardDescription>Scheduled under your linked organization.</CardDescription>
								</CardHeader>
								<CardContent>
									{(record.appointments || []).length === 0 ? (
										<p className="text-sm text-muted-foreground">No appointments on file.</p>
									) : (
										<ul className="divide-y rounded-lg border border-border/80 overflow-hidden">
											{record.appointments.map((a) => (
												<li
													key={a.id}
													className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm bg-card hover:bg-muted/40 transition-colors"
												>
													<span className="font-medium">
														{formatDateShort(a.appointment_date)}
														{a.appointment_time ? ` · ${a.appointment_time}` : ''}
													</span>
													<span className="text-muted-foreground capitalize">{a.appointment_type || a.type || 'Visit'}</span>
													<Badge variant="secondary" className="capitalize shrink-0">
														{a.status || 'scheduled'}
													</Badge>
												</li>
											))}
										</ul>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="records" className="space-y-10 mt-4">
							{recordsLoading ? (
								<div className="flex justify-center py-16">
									<LoadingSpinner />
								</div>
							) : !recordsUnlocked ? (
								<Card className="border-dashed shadow-sm">
									<CardContent className="py-10 text-center text-sm text-muted-foreground space-y-4">
										<p>Enter your account password to view this patient&apos;s health records.</p>
										<Button
											type="button"
											className="bg-teal-600 hover:bg-teal-700 text-white"
											onClick={() => setPasswordDialogOpen(true)}
										>
											Unlock Records
										</Button>
									</CardContent>
								</Card>
							) : (
							<>
							<section className="space-y-3">
								<div>
									<h2 className="text-lg font-semibold flex items-center gap-2">
										<FileText className="h-5 w-5 text-teal-600" />
										Patient-reported health records
									</h2>
									<p className="text-sm text-muted-foreground mt-1 max-w-3xl">
										Conditions, allergies, labs, and other items the patient entered in the Records flow—not a legal medical record.
									</p>
								</div>
								<Card className="shadow-sm overflow-hidden">
									<CardContent className="p-0">
										{(chartRecords.health_records || []).length === 0 ? (
											<p className="text-sm text-muted-foreground p-6">No structured health records submitted.</p>
										) : (
											<div className="overflow-x-auto">
												<table className="w-full text-sm">
													<thead className="bg-muted/60 border-b">
														<tr className="text-left text-muted-foreground">
															<th className="px-4 py-3 font-semibold">Type</th>
															<th className="px-4 py-3 font-semibold">Title</th>
															<th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
															<th className="px-4 py-3 font-semibold">Facility</th>
															<th className="px-4 py-3 font-semibold min-w-[12rem]">Notes</th>
														</tr>
													</thead>
													<tbody>
														{chartRecords.health_records.map((r) => (
															<tr key={r.id} className="border-b border-border/50 align-top odd:bg-muted/20 hover:bg-muted/40 transition-colors">
																<td className="px-4 py-3 align-middle">
																	<Badge variant="outline" className="capitalize font-normal">
																		{r.record_type?.replace(/_/g, ' ') || '—'}
																	</Badge>
																</td>
																<td className="px-4 py-3 font-medium">{r.title}</td>
																<td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateShort(r.record_date)}</td>
																<td className="px-4 py-3 text-muted-foreground">{r.provider_or_facility || '—'}</td>
																<td className="px-4 py-3 text-muted-foreground max-w-md whitespace-pre-wrap">{r.notes || '—'}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										)}
									</CardContent>
								</Card>
							</section>

							<section className="space-y-4">
								<div>
									<h2 className="text-lg font-semibold flex items-center gap-2">
										<ClipboardList className="h-5 w-5 text-teal-600" />
										Intake questionnaire
									</h2>
									<p className="text-sm text-muted-foreground mt-1 max-w-3xl">
										Responses from the patient onboarding wizard, shown in clinical field order—not raw JSON.
									</p>
								</div>
								<div className="space-y-4">
									{(chartRecords.onboarding_steps || []).length === 0 ? (
										<Card className="shadow-sm">
											<CardContent className="py-8 text-sm text-muted-foreground text-center">
												No onboarding responses stored.
											</CardContent>
										</Card>
									) : (
										chartRecords.onboarding_steps.map((s) => (
											<ProviderOnboardingStepCard
												key={s.step}
												step={s.step}
												data={s.data}
												updatedLabel={s.updated_at ? `Updated ${formatDate(s.updated_at)}` : undefined}
											/>
										))
									)}
								</div>
							</section>

							<section className="space-y-3">
								<h2 className="text-lg font-semibold flex items-center gap-2">
									<Pill className="h-5 w-5 text-teal-600" />
									Medications
								</h2>
								<Card className="shadow-sm">
									<CardContent className="p-0">
										{(chartRecords.prescriptions || []).length === 0 ? (
											<p className="text-sm text-muted-foreground p-6">No prescriptions on file.</p>
										) : (
											<ul className="divide-y rounded-lg border border-border/80">
												{chartRecords.prescriptions.map((rx) => (
													<li key={rx.id} className="px-4 py-3 text-sm hover:bg-muted/30 transition-colors">
														<p className="font-semibold text-foreground">{rx.medication_name}</p>
														<p className="text-muted-foreground mt-0.5">
															{[rx.dosage, rx.frequency].filter(Boolean).join(' · ') || '—'}
														</p>
														<p className="text-xs text-muted-foreground mt-1.5 capitalize">
															{rx.status || 'active'} · prescribed {formatDateShort(rx.date_prescribed)}
														</p>
													</li>
												))}
											</ul>
										)}
									</CardContent>
								</Card>
							</section>

							<section className="space-y-3">
								<h2 className="text-lg font-semibold flex items-center gap-2">
									<FlaskConical className="h-5 w-5 text-teal-600" />
									Lab results
								</h2>
								<Card className="shadow-sm overflow-hidden">
									<CardContent className="p-0">
										{(chartRecords.lab_results || []).length === 0 ? (
											<p className="text-sm text-muted-foreground p-6">No lab results on file.</p>
										) : (
											<div className="overflow-x-auto">
												<table className="w-full text-sm">
													<thead className="bg-muted/60 border-b">
														<tr className="text-left text-muted-foreground">
															<th className="px-4 py-3 font-semibold">Test</th>
															<th className="px-4 py-3 font-semibold">Value</th>
															<th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
														</tr>
													</thead>
													<tbody>
														{chartRecords.lab_results.map((lab) => (
															<tr key={lab.id} className="border-b border-border/50 odd:bg-muted/20 hover:bg-muted/40 transition-colors">
																<td className="px-4 py-3 font-medium">{lab.test_name}</td>
																<td className="px-4 py-3">
																	{lab.result_value}
																	{lab.unit ? ` ${lab.unit}` : ''}
																</td>
																<td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateShort(lab.test_date)}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										)}
									</CardContent>
								</Card>
							</section>

							<section className="space-y-3">
								<h2 className="text-lg font-semibold flex items-center gap-2">
									<StickyNote className="h-5 w-5 text-teal-600" />
									Clinical notes
								</h2>
								<Card className="shadow-sm">
									<CardContent className="p-0">
										{(chartRecords.clinical_notes || []).length === 0 ? (
											<p className="text-sm text-muted-foreground p-6">No clinical notes yet.</p>
										) : (
											<ul className="divide-y rounded-lg border border-border/80">
												{chartRecords.clinical_notes.map((n) => (
													<li key={n.id} className="px-4 py-4 hover:bg-muted/25 transition-colors">
														<div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
															<span className="font-semibold text-foreground">{n.author_label}</span>
															<time dateTime={n.date_created}>{formatDate(n.date_created)}</time>
														</div>
														<p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-teal-500/50">
															{n.note_content}
														</p>
													</li>
												))}
											</ul>
										)}
									</CardContent>
								</Card>
							</section>
							</>
							)}
						</TabsContent>
					</Tabs>

					<Card className="shadow-sm border-teal-500/20">
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
