import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

/**
 * Token/code field with no maxLength. Parent handles verifySignupEmail.
 */
export default function EmailVerificationStep({
	email,
	onVerify,
	onBack,
	isLoading,
	submitLabel = 'Verify email',
	accentClassName = 'bg-primary hover:bg-primary/90',
}) {
	const [token, setToken] = useState('');

	const handleSubmit = async (e) => {
		e.preventDefault();
		await onVerify(token);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<p className="text-sm text-muted-foreground">
				We sent a verification code to <span className="font-medium text-foreground">{email}</span>. Paste the code
				below (no length limit).
			</p>
			<div className="space-y-2">
				<Label htmlFor="email-verify-token">Verification code</Label>
				<textarea
					id="email-verify-token"
					value={token}
					onChange={(e) => setToken(e.target.value)}
					rows={4}
					className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
					placeholder="Paste your code"
					autoComplete="one-time-code"
				/>
			</div>
			<Button type="submit" className={`w-full rounded-xl h-11 text-white ${accentClassName}`} disabled={isLoading}>
				{isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
				{submitLabel}
			</Button>
			{onBack ? (
				<Button type="button" variant="ghost" className="w-full rounded-xl" onClick={onBack} disabled={isLoading}>
					Back to sign up
				</Button>
			) : null}
		</form>
	);
}
