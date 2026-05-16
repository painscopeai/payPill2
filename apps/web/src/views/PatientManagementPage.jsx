import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProviderDataTable from '@/components/provider/ProviderDataTable.jsx';
import { usePatients } from '@/hooks/usePatients.js';
import { FileText } from 'lucide-react';
import { TableRowActionsMenu } from '@/components/TableRowActionsMenu.jsx';
import { formatPersonDisplayName } from '@/lib/providerPatientChartFormat';

function activityBadgeVariant(kind) {
	switch (String(kind || '').toLowerCase()) {
		case 'documenting':
			return 'default';
		case 'today':
		case 'upcoming':
			return 'secondary';
		default:
			return 'outline';
	}
}

function coverageLine(cov) {
	if (!cov) return 'Coverage not on file';
	const type = cov.coverage_type === 'employer' ? 'Employee' : 'Walk-in';
	const parts = [type];
	if (cov.insurance_label) parts.push(cov.insurance_label);
	if (cov.employer_name) parts.push(cov.employer_name);
	return parts.join(' · ');
}

function formatDateShort(value) {
	if (!value) return '—';
	const d = /^\d{4}-\d{2}-\d{2}/.test(String(value))
		? new Date(`${String(value).slice(0, 10)}T12:00:00`)
		: new Date(value);
	return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function formatDobWithAge(dob) {
	if (!dob) return '—';
	const d = /^\d{4}-\d{2}-\d{2}/.test(String(dob))
		? new Date(`${String(dob).slice(0, 10)}T12:00:00`)
		: new Date(dob);
	if (Number.isNaN(d.getTime())) return String(dob);
	const label = d.toLocaleDateString();
	const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
	if (age >= 0 && age < 130) return `${label} (${age} yr)`;
	return label;
}

export default function PatientManagementPage() {
	const { patients, loading } = usePatients();

	const rows = useMemo(
		() =>
			(patients || []).map((p) => ({
				...p,
				coverage_sort: coverageLine(p.coverage_summary),
				email_sort: p.patient_email || '',
				phone_sort: p.patient_phone || '',
				dob_sort: p.patient_date_of_birth || '',
				last_visit_sort: p.last_visit_date || '',
				next_visit_sort: p.next_visit_date || '',
			})),
		[patients],
	);

	const columns = useMemo(
		() => [
			{
				key: 'patient_name',
				label: 'Patient',
				sortable: true,
				render: (row) => {
					const name = formatPersonDisplayName(row.patient_name || 'Patient');
					const initials = name ? name.substring(0, 2).toUpperCase() : 'PT';
					return (
						<div className="flex items-center gap-3 min-w-0">
							<div className="h-10 w-10 rounded-full bg-teal-500/15 flex items-center justify-center text-teal-800 dark:text-teal-200 font-semibold text-xs shrink-0">
								{initials}
							</div>
							<div className="min-w-0">
								<span className="font-medium text-foreground truncate block">{name || 'Patient'}</span>
								{row.patient_gender ? (
									<span className="text-xs text-muted-foreground capitalize">{row.patient_gender}</span>
								) : null}
							</div>
						</div>
					);
				},
			},
			{
				key: 'email_sort',
				label: 'Email',
				sortable: true,
				render: (row) => (
					<span className="text-sm text-muted-foreground truncate max-w-[14rem] block">
						{row.patient_email || '—'}
					</span>
				),
			},
			{
				key: 'phone_sort',
				label: 'Phone',
				sortable: true,
				render: (row) => (
					<span className="text-sm whitespace-nowrap">{row.patient_phone || '—'}</span>
				),
			},
			{
				key: 'dob_sort',
				label: 'Date of birth',
				sortable: true,
				render: (row) => (
					<span className="text-sm whitespace-nowrap">{formatDobWithAge(row.patient_date_of_birth)}</span>
				),
			},
			{
				key: 'coverage_sort',
				label: 'Coverage',
				sortable: true,
				render: (row) => (
					<p className="text-sm text-muted-foreground max-w-[12rem] line-clamp-2">{coverageLine(row.coverage_summary)}</p>
				),
			},
			{
				key: 'patient_activity_status',
				label: 'Care status',
				sortable: true,
				render: (row) => {
					const label = row.patient_activity_status || 'Patient';
					const kind = row.patient_activity_kind || '';
					return (
						<Badge
							variant={activityBadgeVariant(kind)}
							className="text-[11px] font-medium whitespace-normal text-left h-auto py-1 px-2 max-w-[200px]"
						>
							{label}
						</Badge>
					);
				},
			},
			{
				key: 'last_visit_sort',
				label: 'Last visit',
				sortable: true,
				render: (row) => (
					<span className="text-sm whitespace-nowrap">{formatDateShort(row.last_visit_date)}</span>
				),
			},
			{
				key: 'next_visit_sort',
				label: 'Next visit',
				sortable: true,
				render: (row) => (
					<span className="text-sm whitespace-nowrap font-medium">
						{row.next_visit_date ? formatDateShort(row.next_visit_date) : '—'}
					</span>
				),
			},
			{
				key: 'appointments_count',
				label: 'Visits',
				sortable: true,
				className: 'w-[4.5rem]',
				render: (row) => (
					<span className="text-sm tabular-nums text-muted-foreground">{row.appointments_count ?? 0}</span>
				),
			},
			{
				key: 'actions',
				label: '',
				sortable: false,
				className: 'w-[72px]',
				render: (row) => (
					<TableRowActionsMenu
						items={[
							{
								label: 'View chart',
								icon: FileText,
								href: `/provider/patients/${encodeURIComponent(row.patient_id)}`,
								className: 'text-teal-700 dark:text-teal-300',
							},
						]}
					/>
				),
			},
		],
		[],
	);

	const emptyMessage = (
		<div className="py-4 px-2 max-w-xl mx-auto text-left">
			<p className="font-medium text-foreground">No patients found for your practice yet.</p>
			<p className="mt-2 text-sm text-muted-foreground leading-relaxed">
				This list fills from bookings with your linked organization, your care-team assignments, prescriptions issued under your practice, and
				clinical or telemedicine activity you have documented. Confirm provider onboarding has linked the correct practice so bookings attach to your org.
			</p>
		</div>
	);

	return (
		<div className="w-full space-y-8">
			<Helmet>
				<title>Patient Management - PayPill</title>
			</Helmet>
			<h1 className="text-3xl font-bold tracking-tight">Patient management</h1>

			<Card className="shadow-sm border-border/50">
				<CardHeader>
					<CardTitle>Your patients</CardTitle>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<ProviderDataTable
						columns={columns}
						data={rows}
						isLoading={loading}
						emptyMessage={emptyMessage}
						getRowId={(r) => String(r.patient_id ?? r.id ?? '')}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
