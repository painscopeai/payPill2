import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';
import { useAuth } from '@/contexts/AuthContext';
import { resolvePostPasswordDashboardPath } from '@/lib/resolvePostPasswordDashboardPath.js';

function hashIndicatesRecovery() {
	if (typeof window === 'undefined') return false;
	const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
	return params.get('type') === 'recovery' || params.has('access_token');
}

export default function AuthUpdatePasswordPage() {
	const navigate = useNavigate();
	const { refreshProfile, isInitializing } = useAuth();
	const [sessionReady, setSessionReady] = useState(false);
	const [sessionInvalid, setSessionInvalid] = useState(false);
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		let cancelled = false;

		const verifyRecoverySession = async () => {
			if (hashIndicatesRecovery()) {
				await new Promise((r) => setTimeout(r, 150));
			}
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (cancelled) return;
			if (session?.user) {
				setSessionReady(true);
				setSessionInvalid(false);
				return;
			}
			setSessionInvalid(true);
		};

		if (!isInitializing) {
			void verifyRecoverySession();
		}

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (cancelled) return;
			if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session?.user) {
				setSessionReady(true);
				setSessionInvalid(false);
			}
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
		};
	}, [isInitializing]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (password.length < 8) {
			toast.error('Password must be at least 8 characters.');
			return;
		}
		if (password !== confirm) {
			toast.error('Passwords do not match.');
			return;
		}
		setSubmitting(true);
		try {
			const { error: upErr } = await supabase.auth.updateUser({
				password,
				data: { must_change_password: false },
			});
			if (upErr) throw upErr;
			await supabase.auth.refreshSession();
			toast.success('Password updated successfully.');
			await refreshProfile();
			const path = await resolvePostPasswordDashboardPath(supabase);
			navigate(path, { replace: true });
		} catch (err) {
			console.error(err);
			toast.error(err?.message || 'Could not update password.');
		} finally {
			setSubmitting(false);
		}
	};

	const waiting = isInitializing || (!sessionReady && !sessionInvalid);

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
			<Helmet>
				<title>Reset password — PayPill</title>
			</Helmet>
			<div className="mb-8 flex flex-col items-center gap-2">
				<PayPillLogo className="h-10 w-auto" />
			</div>

			{waiting && (
				<Card className="w-full max-w-md shadow-lg border-border/60">
					<CardContent className="py-12 flex flex-col items-center gap-3">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						<p className="text-sm text-muted-foreground">Verifying reset link…</p>
					</CardContent>
				</Card>
			)}

			{sessionInvalid && !waiting && (
				<Card className="w-full max-w-md shadow-lg border-border/60">
					<CardHeader>
						<CardTitle className="text-xl">Link expired or invalid</CardTitle>
						<CardDescription>
							Request a new password reset from your portal sign-in page, or contact support if the
							problem continues.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button className="w-full" variant="outline" onClick={() => navigate('/', { replace: true })}>
							Return to home
						</Button>
					</CardContent>
				</Card>
			)}

			{sessionReady && !waiting && (
				<Card className="w-full max-w-md shadow-lg border-border/60">
					<CardHeader>
						<CardTitle className="text-xl">Set a new password</CardTitle>
						<CardDescription>Choose a strong password, then continue to your dashboard.</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="reset-np">New password</Label>
								<Input
									id="reset-np"
									type="password"
									autoComplete="new-password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									minLength={8}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="reset-cp">Confirm password</Label>
								<Input
									id="reset-cp"
									type="password"
									autoComplete="new-password"
									value={confirm}
									onChange={(e) => setConfirm(e.target.value)}
									required
									minLength={8}
								/>
							</div>
							<Button type="submit" className="w-full" disabled={submitting}>
								{submitting ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin mr-2" />
										Saving…
									</>
								) : (
									'Update password & continue'
								)}
							</Button>
						</form>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
