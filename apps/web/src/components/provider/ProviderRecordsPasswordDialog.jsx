import React, { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';

export default function ProviderRecordsPasswordDialog({ open, onOpenChange, patientId, onUnlocked }) {
	const [password, setPassword] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	const handleOpenChange = (next) => {
		if (!next) {
			setPassword('');
			setError('');
		}
		onOpenChange(next);
	};

	const submit = async (e) => {
		e.preventDefault();
		if (!patientId || !password) return;
		setSubmitting(true);
		setError('');
		try {
			const res = await apiServerClient.fetch(
				`/provider/patients/${encodeURIComponent(patientId)}/records-access`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ password }),
				},
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(body.error || 'Could not verify password');
			}
			setPassword('');
			onUnlocked();
			handleOpenChange(false);
		} catch (err) {
			setError(err.message || 'Incorrect password');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Lock className="h-5 w-5 text-teal-600" />
						Verify your password
					</DialogTitle>
					<DialogDescription>
						For patient privacy, enter your PayPill account password to view health records, intake responses,
						medications, labs, and clinical notes.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="provider-records-password">Password</Label>
						<Input
							id="provider-records-password"
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Your account password"
							required
							disabled={submitting}
						/>
						{error ? <p className="text-sm text-destructive">{error}</p> : null}
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
							Cancel
						</Button>
						<Button type="submit" disabled={submitting || !password} className="bg-teal-600 hover:bg-teal-700 text-white">
							{submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
							Continue to Records
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
