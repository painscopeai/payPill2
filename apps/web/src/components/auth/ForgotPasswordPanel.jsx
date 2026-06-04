import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Inline forgot-password step on portal sign-in pages.
 */
export default function ForgotPasswordPanel({
	initialEmail = '',
	accentClassName = 'bg-primary hover:bg-primary/90 text-white',
	linkClassName = 'text-primary',
	onBack,
}) {
	const { requestPasswordReset, isAuthPending } = useAuth();
	const [email, setEmail] = useState(initialEmail);
	const [localError, setLocalError] = useState('');
	const [sent, setSent] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLocalError('');
		try {
			await requestPasswordReset(email);
			setSent(true);
		} catch (err) {
			setLocalError(err?.message || 'Could not send reset email.');
		}
	};

	if (sent) {
		return (
			<div className="space-y-4 text-center">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
					<Mail className="h-6 w-6 text-muted-foreground" />
				</div>
				<p className="text-sm text-muted-foreground leading-relaxed">
					If an account exists for <strong className="text-foreground">{email.trim()}</strong>, you will
					receive a password reset link shortly. Check your inbox and spam folder.
				</p>
				<Button type="button" variant="outline" className="w-full rounded-xl" onClick={onBack}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to sign in
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Enter your email and we will send you a link to reset your password.
			</p>
			{localError && (
				<div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">{localError}</div>
			)}
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="forgot-email">Email address</Label>
					<Input
						id="forgot-email"
						type="email"
						required
						autoComplete="email"
						className="rounded-xl"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
				</div>
				<Button type="submit" className={`w-full rounded-xl h-11 ${accentClassName}`} disabled={isAuthPending}>
					{isAuthPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
					Send reset link
				</Button>
				<Button
					type="button"
					variant="link"
					className={`w-full text-sm ${linkClassName}`}
					onClick={onBack}
				>
					<ArrowLeft className="mr-2 h-4 w-4 inline" />
					Back to sign in
				</Button>
			</form>
		</div>
	);
}
