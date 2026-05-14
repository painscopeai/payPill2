import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';
import { useAuth } from '@/contexts/AuthContext';

export default function PatientInsuranceProfilePage() {
	const { refreshProfile } = useAuth();
	const [loading, setLoading] = useState(true);
	const [orgs, setOrgs] = useState([]);
	const [profile, setProfile] = useState(null);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({ insuranceOrgId: '', memberId: '' });

	useEffect(() => {
		let c = false;
		(async () => {
			setLoading(true);
			try {
				const [optRes, profRes] = await Promise.all([
					apiServerClient.fetch('/patient/insurance-options'),
					apiServerClient.fetch('/patient/insurance-change-request'),
				]);
				const optBody = await optRes.json().catch(() => ({}));
				const profBody = await profRes.json().catch(() => ({}));
				if (!optRes.ok) throw new Error(optBody.error || 'Failed to load insurers');
				if (!profRes.ok) throw new Error(profBody.error || 'Failed to load profile');
				if (c) return;
				setOrgs(optBody.organizations || []);
				setProfile(profBody);
				setForm({
					insuranceOrgId: profBody.pending_request?.requested_insurance_user_id || '',
					memberId: profBody.pending_request?.requested_member_id || '',
				});
			} catch (e) {
				if (!c) toast.error(e.message || 'Failed to load');
			} finally {
				if (!c) setLoading(false);
			}
		})();
		return () => {
			c = true;
		};
	}, []);

	const submitRequest = async (e) => {
		e.preventDefault();
		if (profile?.is_employee) {
			toast.error('Your insurance is assigned by your employer.');
			return;
		}
		if (profile?.pending_request) {
			toast.message('You already have a pending request.');
			return;
		}
		if (!form.insuranceOrgId || !form.memberId.trim()) {
			toast.error('Select an insurance company and enter your member ID.');
			return;
		}
		setSaving(true);
		try {
			const res = await apiServerClient.fetch('/patient/insurance-change-request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					requested_insurance_user_id: form.insuranceOrgId,
					requested_member_id: form.memberId.trim(),
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Request failed');
			toast.success('Request submitted. Your insurer will review it in their portal.');
			await refreshProfile();
			const profRes = await apiServerClient.fetch('/patient/insurance-change-request');
			const profBody = await profRes.json().catch(() => ({}));
			if (profRes.ok) setProfile(profBody);
		} catch (err) {
			toast.error(err.message || 'Failed to submit');
		} finally {
			setSaving(false);
		}
	};

	const currentOrgLabel = profile?.insurance_org?.display_name || '—';
	const pending = profile?.pending_request;

	return (
		<div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
			<Helmet>
				<title>Insurance & coverage - PayPill</title>
			</Helmet>
			<h1 className="text-2xl font-bold tracking-tight">Insurance & coverage</h1>
			<p className="text-muted-foreground text-sm">
				Walk-in patients choose a registered insurer and member ID. Changes after signup require approval from
				that insurer.
			</p>

			{loading ? (
				<div className="flex justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : (
				<>
					<Card>
						<CardHeader>
							<CardTitle>Current coverage</CardTitle>
							<CardDescription>
								{profile?.is_employee
									? 'You are covered through your employer roster.'
									: 'Billing uses the insurer and member ID on file.'}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							<p>
								<span className="text-muted-foreground">Type: </span>
								{profile?.is_employee ? 'Employee' : 'Walk-in'}
							</p>
							<p>
								<span className="text-muted-foreground">Insurer: </span>
								{currentOrgLabel}
							</p>
							<p>
								<span className="text-muted-foreground">Member ID: </span>
								{profile?.insurance_member_id ? '••••' + String(profile.insurance_member_id).slice(-4) : '—'}
							</p>
							{pending ? (
								<p className="text-amber-700 dark:text-amber-400 pt-2 border-t">
									Pending change to <strong>{pending.requested_insurance_display_name}</strong> (submitted{' '}
									{pending.created_at ? new Date(pending.created_at).toLocaleString() : ''}).
								</p>
							) : null}
						</CardContent>
					</Card>

					{!profile?.is_employee ? (
						<Card>
							<CardHeader>
								<CardTitle>Request insurance change</CardTitle>
								<CardDescription>
									Submit a new insurer and member ID. It takes effect only after the insurer approves in
									their admin portal.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{pending ? (
									<p className="text-sm text-muted-foreground">Cancel is not available in-app; contact support if needed.</p>
								) : (
									<form onSubmit={submitRequest} className="space-y-4">
										<div className="space-y-2">
											<Label>Insurance company</Label>
											<Select
												value={form.insuranceOrgId || undefined}
												onValueChange={(v) => setForm((f) => ({ ...f, insuranceOrgId: v }))}
												required
											>
												<SelectTrigger>
													<SelectValue placeholder="Select insurer" />
												</SelectTrigger>
												<SelectContent>
													{orgs.map((o) => (
														<SelectItem key={o.id} value={o.id}>
															{o.display_name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label htmlFor="mid">Insurance / member ID</Label>
											<Input
												id="mid"
												required
												value={form.memberId}
												onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
												placeholder="Policy or member number"
											/>
										</div>
										<Button type="submit" disabled={saving}>
											{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
											Submit for approval
										</Button>
									</form>
								)}
							</CardContent>
						</Card>
					) : null}
				</>
			)}
		</div>
	);
}
