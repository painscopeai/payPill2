import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';
import { LogOut, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

const DAY_ORDER = [
	{ key: 'mon', label: 'Monday' },
	{ key: 'tue', label: 'Tuesday' },
	{ key: 'wed', label: 'Wednesday' },
	{ key: 'thu', label: 'Thursday' },
	{ key: 'fri', label: 'Friday' },
	{ key: 'sat', label: 'Saturday' },
	{ key: 'sun', label: 'Sunday' },
];

const DEFAULT_WEEKLY = {
	mon: [{ start: '09:00', end: '17:00' }],
	tue: [{ start: '09:00', end: '17:00' }],
	wed: [{ start: '09:00', end: '17:00' }],
	thu: [{ start: '09:00', end: '17:00' }],
	fri: [{ start: '09:00', end: '17:00' }],
	sat: [],
	sun: [],
};

const EMPTY_WEEKLY = () => ({
	sun: [],
	mon: [],
	tue: [],
	wed: [],
	thu: [],
	fri: [],
	sat: [],
});

const TIMEZONES = [
	'UTC',
	'America/New_York',
	'America/Chicago',
	'America/Denver',
	'America/Los_Angeles',
	'America/Phoenix',
	'Europe/London',
	'Europe/Paris',
	'Asia/Tokyo',
	'Australia/Sydney',
];

function hasWeeklyWindows(wh) {
	if (!wh || typeof wh !== 'object') return false;
	return DAY_ORDER.some(({ key }) => Array.isArray(wh[key]) && wh[key].length > 0);
}

export default function ProviderOnboardingWizard() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const isEdit = searchParams.get('edit') === '1';
	const { logout, refreshProfile, currentUser } = useAuth();

	const [step, setStep] = useState(1);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [completedFlag, setCompletedFlag] = useState(false);

	const [practiceName, setPracticeName] = useState('');
	const [address, setAddress] = useState('');
	const [practicePhone, setPracticePhone] = useState('');

	const [timezone, setTimezone] = useState('UTC');
	const [slotDuration, setSlotDuration] = useState('30');
	const [weeklyHours, setWeeklyHours] = useState(() => ({ ...EMPTY_WEEKLY(), ...DEFAULT_WEEKLY }));

	const progress = useMemo(() => Math.round((step / 3) * 100), [step]);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch('/provider/onboarding');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(body.error || 'Failed to load onboarding');
			}

			setCompletedFlag(body.provider_onboarding_completed === true);

			const practice = body.practice;
			setPracticeName(
				(practice && (practice.name || practice.provider_name)) || currentUser?.name || '',
			);
			setAddress((practice && practice.address) || '');
			setPracticePhone((practice && practice.phone) || currentUser?.phone || '');

			const sched = body.schedule || {};
			setTimezone(typeof sched.timezone === 'string' && sched.timezone ? sched.timezone : 'UTC');
			setSlotDuration(String(sched.slot_duration_minutes || 30));

			const wh = sched.weekly_hours && typeof sched.weekly_hours === 'object' ? sched.weekly_hours : {};
			if (hasWeeklyWindows(wh)) {
				const base = EMPTY_WEEKLY();
				for (const { key } of DAY_ORDER) {
					if (Array.isArray(wh[key]) && wh[key].length) {
						base[key] = wh[key].map((w) => ({
							start: String(w.start || '09:00'),
							end: String(w.end || '17:00'),
						}));
					}
				}
				setWeeklyHours(base);
			} else {
				setWeeklyHours({ ...EMPTY_WEEKLY(), ...DEFAULT_WEEKLY });
			}
		} catch (e) {
			toast.error(e?.message || 'Could not load onboarding');
		} finally {
			setLoading(false);
		}
	}, [currentUser?.name, currentUser?.phone]);

	useEffect(() => {
		void load();
	}, [load]);

	const setDayEnabled = (key, enabled) => {
		setWeeklyHours((prev) => ({
			...prev,
			[key]: enabled ? [{ start: '09:00', end: '17:00' }] : [],
		}));
	};

	const updateDayWindow = (key, field, value) => {
		setWeeklyHours((prev) => {
			const cur = prev[key]?.[0] || { start: '09:00', end: '17:00' };
			return {
				...prev,
				[key]: [{ ...cur, [field]: value }],
			};
		});
	};

	const savePractice = async () => {
		const name = practiceName.trim();
		if (!name) {
			toast.error('Practice name is required');
			return false;
		}
		const res = await apiServerClient.fetch('/provider/onboarding/practice', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				practiceName: name,
				address: address.trim() || null,
				phone: practicePhone.trim() || null,
			}),
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) {
			toast.error(body.error || 'Could not save practice');
			return false;
		}
		return true;
	};

	const saveSchedule = async () => {
		if (!hasWeeklyWindows(weeklyHours)) {
			toast.error('Turn on at least one weekday with start and end times');
			return false;
		}
		const slot = parseInt(slotDuration, 10) || 30;
		const res = await apiServerClient.fetch('/provider/onboarding/schedule', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				timezone,
				slot_duration_minutes: slot,
				weekly_hours: weeklyHours,
			}),
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) {
			toast.error(body.error || 'Could not save schedule');
			return false;
		}
		return true;
	};

	const handleNext = async () => {
		setSaving(true);
		try {
			if (step === 1) {
				const ok = await savePractice();
				if (!ok) return;
				await refreshProfile();
				setStep(2);
				return;
			}
			if (step === 2) {
				const ok = await saveSchedule();
				if (!ok) return;
				setStep(3);
				return;
			}
		} finally {
			setSaving(false);
		}
	};

	const handleBack = () => {
		if (step > 1) setStep((s) => s - 1);
	};

	const handleFinish = async () => {
		setSaving(true);
		try {
			const res = await apiServerClient.fetch('/provider/onboarding/complete', { method: 'POST' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error(body.error || 'Could not complete setup');
				return;
			}
			await refreshProfile();
			toast.success('Setup complete');
			navigate('/provider/dashboard');
		} finally {
			setSaving(false);
		}
	};

	const handleLogout = () => {
		void logout();
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-muted/30">
				<p className="text-sm text-muted-foreground">Loading setup…</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-muted/30 flex flex-col">
			<Helmet>
				<title>Provider setup - PayPill</title>
			</Helmet>
			<header className="border-b bg-background/95 backdrop-blur shrink-0">
				<div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
					<div className="flex items-center gap-2 min-w-0">
						<PayPillLogo className="h-7 max-h-8 w-auto shrink-0" />
						<span className="text-sm text-muted-foreground truncate hidden sm:inline">
							{isEdit ? 'Edit practice & availability' : 'Practice setup'}
						</span>
					</div>
					<Button type="button" variant="ghost" size="sm" onClick={handleLogout} className="shrink-0">
						<LogOut className="h-4 w-4 mr-2" />
						Logout
					</Button>
				</div>
			</header>

			<main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
				<div className="mb-6 space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="font-medium text-teal-800 dark:text-teal-200">Step {step} of 3</span>
						{completedFlag && isEdit ? (
							<span className="text-muted-foreground flex items-center gap-1">
								<CheckCircle2 className="h-4 w-4 text-teal-600" /> Editing saved practice
							</span>
						) : null}
					</div>
					<Progress value={progress} className="h-2" />
				</div>

				{step === 1 ? (
					<Card>
						<CardHeader>
							<CardTitle>Practice details</CardTitle>
							<CardDescription>How patients and partners will see your organization.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="pon-practice">Practice name</Label>
								<Input
									id="pon-practice"
									value={practiceName}
									onChange={(e) => setPracticeName(e.target.value)}
									placeholder="e.g. Lakeside Family Medicine"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="pon-addr">Address (optional)</Label>
								<Input
									id="pon-addr"
									value={address}
									onChange={(e) => setAddress(e.target.value)}
									placeholder="Street, city, state"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="pon-phone">Practice phone (optional)</Label>
								<Input
									id="pon-phone"
									value={practicePhone}
									onChange={(e) => setPracticePhone(e.target.value)}
									placeholder="Main scheduling line"
								/>
							</div>
						</CardContent>
					</Card>
				) : null}

				{step === 2 ? (
					<Card>
						<CardHeader>
							<CardTitle>Weekly availability</CardTitle>
							<CardDescription>Used for smart booking suggestions on your calendar.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label>Timezone</Label>
									<Select value={timezone} onValueChange={setTimezone}>
										<SelectTrigger>
											<SelectValue placeholder="Timezone" />
										</SelectTrigger>
										<SelectContent>
											{TIMEZONES.map((tz) => (
												<SelectItem key={tz} value={tz}>
													{tz}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Default appointment length (minutes)</Label>
									<Select value={slotDuration} onValueChange={setSlotDuration}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{['15', '20', '30', '45', '60', '90', '120'].map((m) => (
												<SelectItem key={m} value={m}>
													{m} min
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="space-y-4">
								{DAY_ORDER.map(({ key, label }) => {
									const enabled = Array.isArray(weeklyHours[key]) && weeklyHours[key].length > 0;
									const win = weeklyHours[key]?.[0] || { start: '09:00', end: '17:00' };
									return (
										<div
											key={key}
											className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center"
										>
											<div className="flex items-center gap-2 sm:w-40 shrink-0">
												<Checkbox
													id={`day-${key}`}
													checked={enabled}
													onCheckedChange={(v) => setDayEnabled(key, Boolean(v))}
												/>
												<Label htmlFor={`day-${key}`} className="font-medium cursor-pointer">
													{label}
												</Label>
											</div>
											{enabled ? (
												<div className="flex flex-wrap items-end gap-3 flex-1">
													<div className="space-y-1">
														<Label className="text-xs text-muted-foreground">Start</Label>
														<Input
															type="time"
															value={win.start}
															onChange={(e) => updateDayWindow(key, 'start', e.target.value)}
														/>
													</div>
													<div className="space-y-1">
														<Label className="text-xs text-muted-foreground">End</Label>
														<Input
															type="time"
															value={win.end}
															onChange={(e) => updateDayWindow(key, 'end', e.target.value)}
														/>
													</div>
												</div>
											) : (
												<p className="text-sm text-muted-foreground">Closed</p>
											)}
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				) : null}

				{step === 3 ? (
					<Card>
						<CardHeader>
							<CardTitle>Review & finish</CardTitle>
							<CardDescription>Confirm your details, then complete setup to open the provider portal.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<p>
								<span className="text-muted-foreground">Practice:</span>{' '}
								<strong>{practiceName.trim() || '—'}</strong>
							</p>
							<p>
								<span className="text-muted-foreground">Schedule:</span>{' '}
								<strong>
									{timezone}, {slotDuration} min slots
								</strong>
							</p>
						</CardContent>
					</Card>
				) : null}

				<div className="flex justify-between pt-8 mt-2 border-t border-border">
					<Button type="button" variant="outline" onClick={handleBack} disabled={step === 1 || saving}>
						<ChevronLeft className="h-4 w-4 mr-1" /> Back
					</Button>
					{step < 3 ? (
						<Button type="button" onClick={() => void handleNext()} disabled={saving}>
							{saving ? 'Saving…' : 'Continue'}
							<ChevronRight className="h-4 w-4 ml-1" />
						</Button>
					) : (
						<Button type="button" onClick={() => void handleFinish()} disabled={saving}>
							{saving ? 'Finishing…' : 'Finish setup'}
						</Button>
					)}
				</div>
			</main>
		</div>
	);
}
