import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { Loader2, UserCheck } from 'lucide-react';

const STATUS_FILTER = [
	{ value: 'all', label: 'All statuses' },
	{ value: 'draft', label: 'Draft only' },
	{ value: 'active', label: 'Active only' },
	{ value: 'pending', label: 'Pending' },
	{ value: 'inactive', label: 'Inactive' },
];

export default function EmployerEmployeeRosterPage() {
	const [employers, setEmployers] = useState([]);
	const [employerId, setEmployerId] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [items, setItems] = useState([]);
	const [insuranceOptions, setInsuranceOptions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [approving, setApproving] = useState(false);
	const [selected, setSelected] = useState(() => new Set());
	const [assignInsurance, setAssignInsurance] = useState('');

	const draftRows = useMemo(() => items.filter((r) => r.status === 'draft'), [items]);
	const insuranceLabelBySlug = useMemo(
		() => new Map(insuranceOptions.map((o) => [o.slug, o.label])),
		[insuranceOptions],
	);

	const loadEmployers = useCallback(async () => {
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			const res = await apiServerClient.fetch('/admin/bulk/employer-options', {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load employers');
			setEmployers(body.items || []);
		} catch (e) {
			console.error(e);
			toast.error(e.message || 'Could not load employer accounts');
		}
	}, []);

	useEffect(() => {
		void loadEmployers();
	}, [loadEmployers]);

	const loadRoster = useCallback(async () => {
		if (!employerId) {
			setItems([]);
			setInsuranceOptions([]);
			setAssignInsurance('');
			setSelected(new Set());
			return;
		}
		setLoading(true);
		try {
			const q = new URLSearchParams({ employerId });
			if (statusFilter && statusFilter !== 'all') q.set('status', statusFilter);
			const res = await apiServerClient.fetch(`/admin/employer-employees?${q.toString()}`);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load roster');
			setItems(body.items || []);
			setInsuranceOptions(body.insuranceOptions || []);
			setAssignInsurance('');
			setSelected(new Set());
		} catch (e) {
			console.error(e);
			toast.error(e.message || 'Could not load roster');
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [employerId, statusFilter]);

	useEffect(() => {
		void loadRoster();
	}, [loadRoster]);

	const toggleOne = (id, checked) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	};

	const toggleAllDrafts = (checked) => {
		if (!checked) {
			setSelected(new Set());
			return;
		}
		setSelected(new Set(draftRows.map((r) => r.id)));
	};

	const allDraftSelected =
		draftRows.length > 0 && draftRows.every((r) => selected.has(r.id));
	const someDraftSelected = draftRows.some((r) => selected.has(r.id));

	const handleApprove = async () => {
		if (!employerId) {
			toast.error('Select an employer.');
			return;
		}
		const ids = Array.from(selected);
		if (!ids.length) {
			toast.error('Select at least one draft employee.');
			return;
		}
		if (!assignInsurance) {
			toast.error('Select an insurance provider.');
			return;
		}
		setApproving(true);
		try {
			const payload = { employerId, ids, insurance_option_slug: assignInsurance };
			const res = await apiServerClient.fetch('/admin/employer-employees/bulk-approve', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Approve failed');
			const { approvedCount = 0, failures = [] } = data;
			if (approvedCount) {
				toast.success(`Approved ${approvedCount} employee(s). They can sign in with the password from the import file, then set a new password.`);
			}
			if (failures.length) {
				const first = failures[0]?.message || 'Some rows failed';
				toast.error(
					failures.length === 1 ? first : `${failures.length} failed: ${first}`,
				);
			}
			await loadRoster();
		} catch (e) {
			console.error(e);
			toast.error(e.message || 'Could not approve');
		} finally {
			setApproving(false);
		}
	};

	return (
		<div className="space-y-6 max-w-6xl mx-auto">
				<div>
				<h1 className="text-3xl font-bold font-display">Employer employee roster</h1>
				<p className="text-muted-foreground">
					Imported employees stay in draft status until you approve them here. Until then their accounts
					cannot sign in. After approval they sign in and choose a new password.
				</p>
				<p className="text-sm text-muted-foreground mt-2">
					<Link to="/admin/bulk-imports?tab=employees" className="text-primary underline-offset-4 hover:underline">
						Bulk import employees
					</Link>
				</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-4 flex-wrap items-end">
				<div className="space-y-2 min-w-[240px] flex-1">
					<Label htmlFor="roster-employer">Employer account</Label>
					<Select value={employerId} onValueChange={setEmployerId}>
						<SelectTrigger id="roster-employer">
							<SelectValue placeholder="Select employer organization" />
						</SelectTrigger>
						<SelectContent>
							{employers.map((e) => (
								<SelectItem key={e.id} value={e.id}>
									{e.label || e.email || e.id}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2 min-w-[180px]">
					<Label>Status filter</Label>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{STATUS_FILTER.map((s) => (
								<SelectItem key={s.value} value={s.value}>
									{s.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				</div>

				<div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end border rounded-lg p-4 bg-muted/30">
				<div className="space-y-2 min-w-[220px] flex-1">
					<Label>
						Insurance at approval{' '}
						<span className="text-destructive" aria-hidden="true">
							*
						</span>
					</Label>
					<Select value={assignInsurance || undefined} onValueChange={setAssignInsurance}>
						<SelectTrigger>
							<SelectValue placeholder="Select insurance provider" />
						</SelectTrigger>
						<SelectContent>
							{insuranceOptions.map((o) => (
								<SelectItem key={o.slug} value={o.slug}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<Button
					className="gap-2"
					disabled={
						approving || !employerId || selected.size === 0 || !assignInsurance || insuranceOptions.length === 0
					}
					onClick={() => void handleApprove()}
				>
					{approving ? (
						<>
							<Loader2 className="w-4 h-4 animate-spin" /> Approving…
						</>
					) : (
						<>
							<UserCheck className="w-4 h-4" /> Approve selected
						</>
					)}
				</Button>
				</div>

				{loading ? (
				<div className="flex justify-center py-16">
					<LoadingSpinner size="lg" />
				</div>
			) : !employerId ? (
				<p className="text-sm text-muted-foreground">Choose an employer to load the roster.</p>
			) : items.length === 0 ? (
				<p className="text-sm text-muted-foreground">No rows match this filter.</p>
				) : (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12">
									<Checkbox
										checked={allDraftSelected}
										onCheckedChange={(v) => toggleAllDrafts(Boolean(v))}
										aria-label="Select all draft rows"
										className={someDraftSelected && !allDraftSelected ? 'opacity-70' : ''}
									/>
								</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Insurance</TableHead>
								<TableHead>Department</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.map((row) => {
								const isDraft = row.status === 'draft';
								const checked = selected.has(row.id);
								return (
									<TableRow key={row.id}>
										<TableCell>
											{isDraft ? (
												<Checkbox
													checked={checked}
													onCheckedChange={(v) => toggleOne(row.id, Boolean(v))}
													aria-label={`Select ${row.email}`}
												/>
											) : (
												<span className="inline-block w-4" />
											)}
										</TableCell>
										<TableCell className="font-medium">
											{[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}
										</TableCell>
										<TableCell className="text-muted-foreground">{row.email}</TableCell>
										<TableCell>
											<Badge variant={isDraft ? 'secondary' : 'default'}>{row.status}</Badge>
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{insuranceLabelBySlug.get(row.insurance_option_slug) || row.insurance_option_slug || '—'}
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{row.department || '—'}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
				)}
		</div>
	);
}
