import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Search,
	UserPlus,
	MoreHorizontal,
	Mail,
	Download,
	Edit,
	Trash2,
	UserCheck,
	UploadCloud,
	Copy,
	Loader2,
	UserX,
} from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const STATUS_FILTER = [
	{ value: 'all', label: 'All statuses' },
	{ value: 'draft', label: 'Pending approval (draft)' },
	{ value: 'active', label: 'Active' },
	{ value: 'inactive', label: 'Inactive' },
];

function emptyAddForm() {
	return {
		first_name: '',
		last_name: '',
		email: '',
		password: '',
		department: '',
		hire_date: '',
		insurance_option_slug: '',
	};
}

function emptyEditForm() {
	return {
		id: '',
		first_name: '',
		last_name: '',
		email: '',
		department: '',
		hire_date: '',
		status: 'active',
		insurance_option_slug: '',
	};
}

export default function EmployeeManagementPage() {
	const { currentUser } = useAuth();
	const navigate = useNavigate();
	const [employees, setEmployees] = useState([]);
	const [insuranceOptions, setInsuranceOptions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');

	const [addOpen, setAddOpen] = useState(false);
	const [addForm, setAddForm] = useState(emptyAddForm());
	const [adding, setAdding] = useState(false);

	const [editOpen, setEditOpen] = useState(false);
	const [editForm, setEditForm] = useState(emptyEditForm());
	const [editing, setEditing] = useState(false);

	const [bulkOpen, setBulkOpen] = useState(false);
	const [bulkFile, setBulkFile] = useState(null);
	const [bulkBusy, setBulkBusy] = useState(false);
	const [bulkResult, setBulkResult] = useState(null);

	const [selected, setSelected] = useState(() => new Set());
	const [assignInsurance, setAssignInsurance] = useState('');
	const [approving, setApproving] = useState(false);

	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [approvalCredentials, setApprovalCredentials] = useState([]);

	const draftRows = useMemo(() => employees.filter((r) => r.status === 'draft'), [employees]);
	const sharingText = useMemo(() => {
		if (!approvalCredentials.length) return '';
		return approvalCredentials
			.map((row) => `Email: ${row.email}\nPassword (from import): ${row.initialPassword}`)
			.join('\n\n');
	}, [approvalCredentials]);

	const fetchEmployees = useCallback(async () => {
		if (!currentUser?.id) {
			setEmployees([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const q = new URLSearchParams();
			if (statusFilter !== 'all') q.set('status', statusFilter);
			if (searchTerm) q.set('search', searchTerm);
			const res = await apiServerClient.fetch(`/employer/employees?${q.toString()}`);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load employees');
			setEmployees(body.items || []);
			setInsuranceOptions(body.insuranceOptions || []);
		} catch (e) {
			console.error(e);
			toast.error(e.message || 'Failed to load employees');
		} finally {
			setLoading(false);
		}
	}, [currentUser?.id, searchTerm, statusFilter]);

	useEffect(() => {
		void fetchEmployees();
	}, [fetchEmployees]);

	const copyText = async (text, success) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(success || 'Copied');
		} catch {
			toast.error('Could not copy');
		}
	};

	const filteredEmployees = useMemo(() => {
		const term = searchTerm.toLowerCase();
		if (!term) return employees;
		return employees.filter(
			(e) =>
				`${e.first_name || ''} ${e.last_name || ''}`.toLowerCase().includes(term) ||
				(e.email || '').toLowerCase().includes(term) ||
				(e.department || '').toLowerCase().includes(term),
		);
	}, [employees, searchTerm]);

	const handleAddEmployee = async () => {
		if (!addForm.email || !addForm.password || !addForm.first_name || !addForm.last_name || !addForm.insurance_option_slug) {
			toast.error('First name, last name, email, temporary password, and insurance are required.');
			return;
		}
		if (addForm.password.length < 8) {
			toast.error('Temporary password must be at least 8 characters.');
			return;
		}
		setAdding(true);
		try {
			const res = await apiServerClient.fetch('/employer/employees', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: addForm.email.trim(),
					password: addForm.password,
					first_name: addForm.first_name.trim(),
					last_name: addForm.last_name.trim(),
					department: addForm.department.trim() || null,
					hire_date: addForm.hire_date || null,
					insurance_option_slug: addForm.insurance_option_slug,
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Could not add employee');
			toast.success('Employee created and can now sign in with their temporary password.');
			setAddOpen(false);
			setAddForm(emptyAddForm());
			void fetchEmployees();
		} catch (e) {
			toast.error(e.message || 'Could not add employee');
		} finally {
			setAdding(false);
		}
	};

	const openEdit = (row) => {
		setEditForm({
			id: row.id,
			first_name: row.first_name || '',
			last_name: row.last_name || '',
			email: row.email || '',
			department: row.department || '',
			hire_date: row.hire_date || '',
			status: row.status || 'active',
			insurance_option_slug: row.insurance_option_slug || '',
		});
		setEditOpen(true);
	};

	const saveEdit = async () => {
		setEditing(true);
		try {
			const res = await apiServerClient.fetch(`/employer/employees/${editForm.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					first_name: editForm.first_name,
					last_name: editForm.last_name,
					department: editForm.department || null,
					hire_date: editForm.hire_date || null,
					status: editForm.status,
					insurance_option_slug: editForm.insurance_option_slug || null,
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Save failed');
			toast.success('Employee updated');
			setEditOpen(false);
			void fetchEmployees();
		} catch (e) {
			toast.error(e.message || 'Save failed');
		} finally {
			setEditing(false);
		}
	};

	const setStatus = async (id, status) => {
		try {
			const res = await apiServerClient.fetch(`/employer/employees/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Action failed');
			toast.success(`Employee ${status}`);
			void fetchEmployees();
		} catch (e) {
			toast.error(e.message || 'Action failed');
		}
	};

	const removeEmployee = async (id) => {
		if (!window.confirm('Permanently delete this employee account? This cannot be undone.')) return;
		try {
			const res = await apiServerClient.fetch(`/employer/employees/${id}`, { method: 'DELETE' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Delete failed');
			toast.success('Employee deleted');
			void fetchEmployees();
		} catch (e) {
			toast.error(e.message || 'Delete failed');
		}
	};

	const toggleSelect = (id, checked) => {
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

	const allDraftSelected = draftRows.length > 0 && draftRows.every((r) => selected.has(r.id));

	const approveSelected = async () => {
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
			const res = await apiServerClient.fetch('/employer/employees/bulk-approve', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids, insurance_option_slug: assignInsurance }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Approve failed');
			const { approvedCount = 0, failures = [], credentials = [] } = data;
			if (approvedCount && Array.isArray(credentials) && credentials.length > 0) {
				setApprovalCredentials(credentials);
				setShareDialogOpen(true);
				toast.success(`Approved ${approvedCount} employee(s). Copy the initial passwords to share.`);
			} else if (approvedCount) {
				toast.success(`Approved ${approvedCount} employee(s).`);
			}
			if (failures.length) {
				const first = failures[0]?.message || 'Some rows failed';
				toast.error(failures.length === 1 ? first : `${failures.length} failed: ${first}`);
			}
			setSelected(new Set());
			setAssignInsurance('');
			void fetchEmployees();
		} catch (e) {
			toast.error(e.message || 'Could not approve');
		} finally {
			setApproving(false);
		}
	};

	const handleBulkUpload = async () => {
		if (!bulkFile) {
			toast.error('Choose a CSV or Excel file');
			return;
		}
		setBulkBusy(true);
		setBulkResult(null);
		try {
			const fd = new FormData();
			fd.set('file', bulkFile);
			const res = await apiServerClient.fetch('/employer/employees/bulk', {
				method: 'POST',
				body: fd,
				timeoutMs: 120_000,
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error || 'Bulk upload failed');
			setBulkResult(data);
			toast.success(`Imported ${data.successCount || 0} row(s). Approve below to enable sign-in.`);
			void fetchEmployees();
		} catch (e) {
			toast.error(e.message || 'Bulk upload failed');
		} finally {
			setBulkBusy(false);
		}
	};

	const handleDownloadTemplate = () => {
		const header = ['email', 'password', 'first_name', 'last_name', 'department', 'hire_date'];
		const sampleRows = [
			['alex.smith@company.com', 'TemporaryPass1!', 'Alex', 'Smith', 'Engineering', '2025-01-15'],
			['jamie.lee@company.com', 'TemporaryPass2!', 'Jamie', 'Lee', 'HR', '2025-02-01'],
		];
		const csv = [header, ...sampleRows].map((r) => r.join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'paypill-employer-employees-template.csv';
		a.click();
		URL.revokeObjectURL(url);
	};

	const exportRosterCsv = () => {
		const header = ['Email', 'First Name', 'Last Name', 'Department', 'Hire Date', 'Status', 'Insurance'];
		const rows = filteredEmployees.map((r) => [
			r.email || '',
			r.first_name || '',
			r.last_name || '',
			r.department || '',
			r.hire_date || '',
			r.status || '',
			r.insurance_option_slug || '',
		]);
		const csv = [header, ...rows]
			.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
			.join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'employer-roster.csv';
		a.click();
		URL.revokeObjectURL(url);
	};

	const insuranceLabel = (slug) => {
		const found = insuranceOptions.find((o) => o.slug === slug);
		return found?.label || slug || '—';
	};

	return (
		<div className="min-h-screen bg-background flex flex-col">
			<Helmet><title>Employees - PayPill</title></Helmet>
			<Header />

			<main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
						<p className="text-muted-foreground">
							Manage your roster. Bulk-imported employees stay in draft status (login blocked) until approved with
							an insurance provider. Employees added individually are activated immediately.
						</p>
					</div>
					<div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
						<Button variant="outline" className="gap-2" onClick={exportRosterCsv}>
							<Download className="h-4 w-4" /> Export
						</Button>
						<Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
							<DialogTrigger asChild>
								<Button variant="outline" className="gap-2">
									<UploadCloud className="h-4 w-4" /> Bulk upload
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-lg">
								<DialogHeader>
									<DialogTitle>Bulk upload employees</DialogTitle>
									<DialogDescription>
										CSV or Excel using these headers exactly: email, password, first_name, last_name,
										department, hire_date. Imported rows are draft until you approve them below.
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-3 py-2">
									<Button variant="outline" type="button" className="gap-2" onClick={handleDownloadTemplate}>
										<Download className="h-4 w-4" /> Download template
									</Button>
									<input
										type="file"
										accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
										onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
									/>
									{bulkResult && (
										<div className="border rounded-md p-3 text-sm">
											<p>
												<span className="font-medium">Success:</span> {bulkResult.successCount || 0} ·
												<span className="font-medium ml-2">Failed:</span> {(bulkResult.failures || []).length}
											</p>
											{(bulkResult.failures || []).length > 0 && (
												<ul className="mt-2 space-y-1 text-destructive text-xs">
													{bulkResult.failures.slice(0, 8).map((f, i) => (
														<li key={i}>
															Row {f.rowNumber}: {f.message}
														</li>
													))}
												</ul>
											)}
										</div>
									)}
								</div>
								<DialogFooter>
									<Button variant="outline" onClick={() => setBulkOpen(false)}>Close</Button>
									<Button onClick={handleBulkUpload} disabled={bulkBusy || !bulkFile} className="gap-2">
										{bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
										{bulkBusy ? 'Uploading…' : 'Upload'}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
						<Dialog open={addOpen} onOpenChange={setAddOpen}>
							<DialogTrigger asChild>
								<Button className="gap-2"><UserPlus className="h-4 w-4" /> Add Employee</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-[480px] rounded-xl">
								<DialogHeader>
									<DialogTitle>Add new employee</DialogTitle>
									<DialogDescription>
										Creates an active account immediately. Employee signs in with this temporary password and must
										choose a new one on first login.
									</DialogDescription>
								</DialogHeader>
								<div className="grid gap-4 py-4">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label>First Name</Label>
											<Input value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} />
										</div>
										<div className="space-y-2">
											<Label>Last Name</Label>
											<Input value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} />
										</div>
									</div>
									<div className="space-y-2">
										<Label>Email</Label>
										<Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
									</div>
									<div className="space-y-2">
										<Label>Temporary password</Label>
										<Input value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} placeholder="min 8 chars" />
									</div>
									<div className="space-y-2">
										<Label>Insurance provider</Label>
										<Select value={addForm.insurance_option_slug} onValueChange={(v) => setAddForm({ ...addForm, insurance_option_slug: v })}>
											<SelectTrigger><SelectValue placeholder="Select insurance provider" /></SelectTrigger>
											<SelectContent>
												{insuranceOptions.map((o) => (
													<SelectItem key={o.slug} value={o.slug}>{o.label}</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label>Department</Label>
											<Input value={addForm.department} onChange={(e) => setAddForm({ ...addForm, department: e.target.value })} />
										</div>
										<div className="space-y-2">
											<Label>Hire date</Label>
											<Input type="date" value={addForm.hire_date} onChange={(e) => setAddForm({ ...addForm, hire_date: e.target.value })} />
										</div>
									</div>
								</div>
								<DialogFooter>
									<Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
									<Button onClick={handleAddEmployee} disabled={adding} className="gap-2">
										{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
										{adding ? 'Saving…' : 'Add employee'}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				<Card className="shadow-sm border-border/50">
					<div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
						<div className="relative w-full sm:max-w-md">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by name, email, or department..."
								className="pl-9 bg-background"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger>
							<SelectContent>
								{STATUS_FILTER.map((s) => (
									<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{draftRows.length > 0 && (
						<div className="p-4 border-b bg-amber-500/5 flex flex-col sm:flex-row gap-3 items-end flex-wrap">
							<div className="flex-1 space-y-1 min-w-[220px]">
								<Label className="text-xs uppercase tracking-wide text-amber-700">
									Approve drafts (insurance required)
								</Label>
								<Select value={assignInsurance || undefined} onValueChange={setAssignInsurance}>
									<SelectTrigger><SelectValue placeholder="Select insurance provider" /></SelectTrigger>
									<SelectContent>
										{insuranceOptions.map((o) => (
											<SelectItem key={o.slug} value={o.slug}>{o.label}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<Button
								className="gap-2"
								onClick={approveSelected}
								disabled={
									approving || selected.size === 0 || !assignInsurance || insuranceOptions.length === 0
								}
							>
								{approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
								{approving ? 'Approving…' : `Approve ${selected.size} selected`}
							</Button>
						</div>
					)}

					<div className="overflow-x-auto">
						<table className="w-full text-sm text-left">
							<thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
								<tr>
									<th className="px-4 py-3 w-10">
										{draftRows.length > 0 && (
											<Checkbox
												checked={allDraftSelected}
												onCheckedChange={(v) => toggleAllDrafts(Boolean(v))}
												aria-label="Select all drafts"
											/>
										)}
									</th>
									<th className="px-4 py-3 font-medium">Employee</th>
									<th className="px-4 py-3 font-medium">Department</th>
									<th className="px-4 py-3 font-medium hidden md:table-cell">Hire Date</th>
									<th className="px-4 py-3 font-medium">Status</th>
									<th className="px-4 py-3 font-medium">Insurance</th>
									<th className="px-4 py-3 font-medium text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{loading ? (
									<tr>
										<td colSpan="7" className="px-6 py-12 text-center text-muted-foreground">Loading employees...</td>
									</tr>
								) : filteredEmployees.length === 0 ? (
									<tr>
										<td colSpan="7" className="px-6 py-12 text-center text-muted-foreground">
											{employees.length === 0
												? 'No employees yet. Use Add Employee or Bulk upload to get started.'
												: 'No employees match your filters.'}
										</td>
									</tr>
								) : (
									filteredEmployees.map((emp) => {
										const isDraft = emp.status === 'draft';
										const checked = selected.has(emp.id);
										return (
											<tr key={emp.id} className="hover:bg-muted/10 transition-colors">
												<td className="px-4 py-4">
													{isDraft ? (
														<Checkbox
															checked={checked}
															onCheckedChange={(v) => toggleSelect(emp.id, Boolean(v))}
															aria-label={`Select ${emp.email}`}
														/>
													) : (
														<span className="inline-block w-4" />
													)}
												</td>
												<td className="px-4 py-4">
													<div className="font-medium text-foreground">
														{[emp.first_name, emp.last_name].filter(Boolean).join(' ') || '—'}
													</div>
													<div className="text-muted-foreground text-xs">{emp.email}</div>
												</td>
												<td className="px-4 py-4 text-foreground">{emp.department || '-'}</td>
												<td className="px-4 py-4 text-muted-foreground hidden md:table-cell">{emp.hire_date || '-'}</td>
												<td className="px-4 py-4">
													<Badge
														variant={isDraft ? 'secondary' : emp.status === 'active' ? 'default' : 'outline'}
														className={
															emp.status === 'active'
																? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-none'
																: isDraft
																	? 'bg-amber-500/10 text-amber-700 border-none'
																	: ''
														}
													>
														{emp.status}
													</Badge>
												</td>
												<td className="px-4 py-4 text-muted-foreground text-sm">
													{insuranceLabel(emp.insurance_option_slug)}
												</td>
												<td className="px-4 py-4 text-right">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="icon" className="h-8 w-8">
																<MoreHorizontal className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end" className="w-48">
															<DropdownMenuItem onClick={() => openEdit(emp)}>
																<Edit className="h-4 w-4 mr-2" /> Edit details
															</DropdownMenuItem>
															<DropdownMenuItem onClick={() => navigate('/employer/messaging')}>
																<Mail className="h-4 w-4 mr-2" /> Message
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															{emp.status === 'active' ? (
																<DropdownMenuItem className="text-warning" onClick={() => setStatus(emp.id, 'inactive')}>
																	<UserX className="h-4 w-4 mr-2" /> Deactivate
																</DropdownMenuItem>
															) : !isDraft ? (
																<DropdownMenuItem className="text-success" onClick={() => setStatus(emp.id, 'active')}>
																	<UserCheck className="h-4 w-4 mr-2" /> Reactivate
																</DropdownMenuItem>
															) : null}
															<DropdownMenuItem className="text-destructive" onClick={() => removeEmployee(emp.id)}>
																<Trash2 className="h-4 w-4 mr-2" /> Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</Card>
			</main>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="sm:max-w-[480px]">
					<DialogHeader>
						<DialogTitle>Edit employee</DialogTitle>
						<DialogDescription>{editForm.email}</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-3">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>First Name</Label>
								<Input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
							</div>
							<div className="space-y-2">
								<Label>Last Name</Label>
								<Input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Department</Label>
								<Input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
							</div>
							<div className="space-y-2">
								<Label>Hire Date</Label>
								<Input type="date" value={editForm.hire_date} onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })} />
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Status</Label>
								<Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="inactive">Inactive</SelectItem>
										<SelectItem value="pending">Pending</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Insurance</Label>
								<Select
									value={editForm.insurance_option_slug || undefined}
									onValueChange={(v) => setEditForm({ ...editForm, insurance_option_slug: v })}
								>
									<SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
									<SelectContent>
										{insuranceOptions.map((o) => (
											<SelectItem key={o.slug} value={o.slug}>{o.label}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
						<Button onClick={saveEdit} disabled={editing} className="gap-2">
							{editing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
							{editing ? 'Saving…' : 'Save changes'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={shareDialogOpen}
				onOpenChange={(open) => {
					setShareDialogOpen(open);
					if (!open) setApprovalCredentials([]);
				}}
			>
				<DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Initial passwords</DialogTitle>
						<DialogDescription>
							Shown once when you approve. Employees use this for first sign-in, then they must choose a new password.
						</DialogDescription>
					</DialogHeader>
					<ul className="space-y-3 text-sm border rounded-md divide-y bg-muted/20">
						{approvalCredentials.map((row) => (
							<li key={row.email} className="p-3 space-y-1">
								<div className="font-medium break-all">{row.email}</div>
								<div className="flex items-center gap-2 flex-wrap">
									<code className="text-xs bg-muted px-2 py-1 rounded break-all flex-1 min-w-0">
										{row.initialPassword}
									</code>
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="shrink-0 gap-1"
										onClick={() => void copyText(row.initialPassword, 'Password copied')}
									>
										<Copy className="w-4 h-4" /> Copy
									</Button>
								</div>
							</li>
						))}
					</ul>
					<DialogFooter>
						<Button
							type="button"
							variant="default"
							className="gap-2"
							onClick={() => void copyText(sharingText, 'All credentials copied')}
						>
							<Copy className="w-4 h-4" /> Copy all
						</Button>
						<Button type="button" variant="outline" onClick={() => setShareDialogOpen(false)}>Done</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
