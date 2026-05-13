import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function ProviderBillingPage() {
	const [invoices, setInvoices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [amount, setAmount] = useState('');
	const [description, setDescription] = useState('');
	const [saving, setSaving] = useState(false);

	const load = async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch('/provider/billing/invoices');
			const body = await res.json().catch(() => ({}));
			if (res.ok) setInvoices(body.items || []);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, []);

	const createInvoice = async (e) => {
		e.preventDefault();
		setSaving(true);
		try {
			const res = await apiServerClient.fetch('/provider/billing/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					amount: Number(amount) || 0,
					description: description || 'Service',
					status: 'draft',
				}),
			});
			if (res.ok) {
				setAmount('');
				setDescription('');
				await load();
			}
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-8 max-w-5xl">
			<Helmet>
				<title>Billing - Provider - PayPill</title>
			</Helmet>
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Billing</h1>
				<p className="text-muted-foreground mt-1">Draft invoices and record payments for your practice.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>New draft invoice</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={createInvoice} className="grid gap-4 sm:grid-cols-3 items-end">
						<div className="space-y-2">
							<Label htmlFor="inv-amt">Amount (USD)</Label>
							<Input id="inv-amt" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="inv-desc">Description</Label>
							<Input id="inv-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
						</div>
						<Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
							{saving ? 'Saving…' : 'Create invoice'}
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Recent invoices</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<LoadingSpinner />
					) : invoices.length === 0 ? (
						<p className="text-muted-foreground text-sm">No invoices yet.</p>
					) : (
						<ul className="divide-y rounded-lg border">
							{invoices.map((inv) => (
								<li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
									<span className="font-medium">{inv.description || 'Invoice'}</span>
									<span className="text-muted-foreground capitalize">{inv.status}</span>
									<span className="tabular-nums">${Number(inv.amount || 0).toFixed(2)}</span>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
