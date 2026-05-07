import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';

export default function AuthResetPasswordRequiredPage() {
	const navigate = useNavigate();
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [submitting, setSubmitting] = useState(false);

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
			const { error: refreshErr } = await supabase.auth.refreshSession();
			if (refreshErr) console.warn('[AuthResetPasswordRequired] refreshSession:', refreshErr);
			toast.success('Password updated. You can continue.');
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const role = session?.user?.user_metadata?.role || 'individual';
			if (role === 'individual' || role === 'patient') {
				navigate('/patient/dashboard', { replace: true });
			} else if (role === 'employer') {
				navigate('/employer/dashboard', { replace: true });
			} else if (role === 'insurance') {
				navigate('/insurance/dashboard', { replace: true });
			} else if (role === 'provider') {
				navigate('/provider/dashboard', { replace: true });
			} else if (role === 'admin') {
				navigate('/admin/dashboard', { replace: true });
			} else {
				navigate('/', { replace: true });
			}
		} catch (err) {
			console.error(err);
			toast.error(err.message || 'Could not update password.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
			<Helmet>
				<title>Set a new password — PayPill</title>
			</Helmet>
			<div className="mb-8 flex flex-col items-center gap-2">
				<PayPillLogo className="h-10 w-auto" />
				<p className="text-sm text-muted-foreground text-center max-w-sm">
					Your account requires a new password before you can continue.
				</p>
			</div>
			<Card className="w-full max-w-md shadow-lg border-border/60">
				<CardHeader>
					<CardTitle className="text-xl">Choose a new password</CardTitle>
					<CardDescription>Use a strong password you have not used elsewhere.</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="np">New password</Label>
							<Input
								id="np"
								type="password"
								autoComplete="new-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								minLength={8}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="cp">Confirm password</Label>
							<Input
								id="cp"
								type="password"
								autoComplete="new-password"
								value={confirm}
								onChange={(e) => setConfirm(e.target.value)}
								required
								minLength={8}
							/>
						</div>
						<Button type="submit" className="w-full" disabled={submitting}>
							{submitting ? 'Saving…' : 'Continue'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
