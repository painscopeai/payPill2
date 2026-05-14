import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import apiServerClient from '@/lib/apiServerClient';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function ProviderPatientDetailPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [patient, setPatient] = useState(null);
	const [loading, setLoading] = useState(true);
	const [notes, setNotes] = useState('');
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await apiServerClient.fetch('/provider/patients');
				const list = await res.json().catch(() => []);
				if (!cancelled && res.ok && Array.isArray(list)) {
					const row = list.find((r) => r.patient_id === id);
					setPatient(row || null);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [id]);

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
			if (res.ok) {
				setNotes('');
				navigate('/provider/patients');
			}
		} finally {
			setSaving(false);
		}
	};

	const d = patient?.patient_details || {};
	const cov = patient?.coverage_summary;

	return (
		<div className="space-y-6 max-w-2xl">
			<Helmet>
				<title>Patient - PayPill</title>
			</Helmet>
			<Button variant="ghost" className="-ml-2 text-muted-foreground" onClick={() => navigate('/provider/patients')}>
				← Back to patients
			</Button>
			{loading ? (
				<LoadingSpinner />
			) : !patient ? (
				<p className="text-muted-foreground">Patient not found or not assigned to you.</p>
			) : (
				<>
					<h1 className="text-3xl font-bold tracking-tight">
						{[d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Patient'}
					</h1>
					{cov ? (
						<Card className="border-primary/20 bg-muted/20">
							<CardHeader className="py-3">
								<CardTitle className="text-base">Patient coverage</CardTitle>
							</CardHeader>
							<CardContent className="text-sm space-y-1 pt-0">
								<p>
									<span className="text-muted-foreground">Type: </span>
									{cov.coverage_type === 'employer' ? 'Employee' : 'Walk-in'}
								</p>
								<p>
									<span className="text-muted-foreground">Age / sex: </span>
									{cov.age_years != null ? `${cov.age_years} yr` : '—'}
									{cov.sex_or_gender ? ` · ${cov.sex_or_gender}` : ''}
								</p>
								<p>
									<span className="text-muted-foreground">Insurance: </span>
									{cov.insurance_label || '—'}
									{cov.member_id_display ? ` · Member ${cov.member_id_display}` : ''}
								</p>
								<p>
									<span className="text-muted-foreground">Employer: </span>
									{cov.coverage_type === 'employer' ? cov.employer_name || '—' : 'Walk-in'}
								</p>
							</CardContent>
						</Card>
					) : null}
					<Card>
						<CardHeader>
							<CardTitle>Clinical note</CardTitle>
						</CardHeader>
						<CardContent>
							<form onSubmit={save} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="note">Note</Label>
									<Textarea id="note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} required />
								</div>
								<Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
									{saving ? 'Saving…' : 'Save note'}
								</Button>
							</form>
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
