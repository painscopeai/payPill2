import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient';

export default function InsuranceMemberRequestsPage() {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [actingId, setActingId] = useState(null);
	const [notes, setNotes] = useState({});

	const load = async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch('/insurance/member-requests');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load');
			setItems(body.items || []);
		} catch (e) {
			toast.error(e.message || 'Failed to load');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, []);

	const act = async (id, action) => {
		setActingId(id);
		try {
			const res = await apiServerClient.fetch('/insurance/member-requests', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id,
					action,
					reviewer_note: notes[id] || null,
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Update failed');
			toast.success(action === 'approve' ? 'Approved. Patient profile updated.' : 'Request rejected.');
			await load();
		} catch (e) {
			toast.error(e.message || 'Failed');
		} finally {
			setActingId(null);
		}
	};

	return (
		<>
			<Helmet>
				<title>Member insurance requests - PayPill</title>
			</Helmet>
			<Header />
			<div className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
				<h1 className="text-2xl font-bold">Walk-in insurance change requests</h1>
				<p className="text-sm text-muted-foreground">
					Approve or reject when a patient selects your organization and submits a new member ID.
				</p>

				{loading ? (
					<div className="flex justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : items.length === 0 ? (
					<Card>
						<CardContent className="py-8 text-center text-muted-foreground text-sm">No pending requests.</CardContent>
					</Card>
				) : (
					items.map((row) => (
						<Card key={row.id}>
							<CardHeader>
								<CardTitle className="text-lg">{row.patient_display_name}</CardTitle>
								<CardDescription>
									Requested member ID: <span className="font-mono">{row.requested_member_id}</span>
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="space-y-2">
									<Label>Note (optional)</Label>
									<Textarea
										rows={2}
										value={notes[row.id] || ''}
										onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
									/>
								</div>
								<div className="flex gap-2">
									<Button
										variant="default"
										disabled={actingId === row.id}
										onClick={() => void act(row.id, 'approve')}
									>
										{actingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
									</Button>
									<Button
										variant="outline"
										disabled={actingId === row.id}
										onClick={() => void act(row.id, 'reject')}
									>
										Reject
									</Button>
								</div>
							</CardContent>
						</Card>
					))
				)}
			</div>
		</>
	);
}
