import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/DataTable.jsx';
import { usePatients } from '@/hooks/usePatients.js';
import { FileText } from 'lucide-react';
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

function linkedBadges(linked) {
	const l = Array.isArray(linked) ? linked : [];
	const items = [];
	if (l.includes('relationship')) items.push({ key: 'ct', label: 'Care team', variant: 'secondary' });
	if (l.includes('appointment')) items.push({ key: 'bk', label: 'Booked', variant: 'outline', className: 'border-teal-500/40' });
	if (l.includes('clinical_note')) items.push({ key: 'nt', label: 'Notes', variant: 'outline' });
	if (l.includes('prescription')) items.push({ key: 'rx', label: 'Rx', variant: 'outline' });
	if (l.includes('telemedicine')) items.push({ key: 'tm', label: 'Video', variant: 'outline' });
	if (l.includes('consultation_encounter')) items.push({ key: 'cn', label: 'Consult', variant: 'outline' });
	return items;
}

export default function PatientManagementPage() {
	const { patients, loading } = usePatients();

	const columns = useMemo(
		() => [
			{
				header: 'Patient',
				accessorKey: 'patient_name',
				cell: (row) => {
					const name = formatPersonDisplayName(row.patient_name || 'Patient');
					const initials = name ? name.substring(0, 2).toUpperCase() : 'PT';
					return (
						<div className="flex items-center gap-3 min-w-0">
							<div className="h-10 w-10 rounded-full bg-teal-500/15 flex items-center justify-center text-teal-800 dark:text-teal-200 font-semibold text-xs shrink-0">
								{initials}
							</div>
							<span className="font-medium text-foreground truncate">{name || 'Patient'}</span>
						</div>
					);
				},
			},
			{
				header: 'Status',
				accessorKey: 'patient_activity_status',
				cell: (row) => {
					const linked = row.linked_via || [];
					const showBooked = linked.includes('appointment');
					const label =
						row.patient_activity_status || (showBooked ? 'Has appointments' : 'Patient');
					const kind = row.patient_activity_kind || '';
					return (
						<Badge
							variant={activityBadgeVariant(kind)}
							className="text-[11px] font-medium whitespace-normal text-left h-auto py-1 px-2 max-w-[220px]"
						>
							{label}
						</Badge>
					);
				},
			},
			{
				header: 'Coverage',
				accessorKey: 'coverage',
				cell: (row) => (
					<p className="text-sm text-muted-foreground max-w-xs line-clamp-2">{coverageLine(row.coverage_summary)}</p>
				),
			},
			{
				header: 'Activity',
				accessorKey: 'linked_via',
				cell: (row) => (
					<div className="flex flex-wrap gap-1">
						{linkedBadges(row.linked_via).map((b) => (
							<Badge
								key={b.key}
								variant={b.variant}
								className={`text-[10px] font-medium uppercase tracking-wide ${b.className || ''}`}
							>
								{b.label}
							</Badge>
						))}
					</div>
				),
			},
			{
				header: '',
				accessorKey: 'actions',
				cell: (row) => (
					<div className="flex justify-end">
						<Button variant="ghost" size="sm" className="gap-1.5 text-teal-700 dark:text-teal-300" asChild>
							<Link to={`/provider/patients/${encodeURIComponent(row.patient_id)}`}>
								<FileText className="h-4 w-4" />
								View chart
							</Link>
						</Button>
					</div>
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
		<div className="space-y-8 max-w-7xl mx-auto">
			<Helmet>
				<title>Patient Management - PayPill</title>
			</Helmet>
			<h1 className="text-3xl font-bold tracking-tight">Patient management</h1>

			<Card className="shadow-sm border-border/50">
				<CardHeader>
					<CardTitle>Your patients</CardTitle>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<DataTable
						columns={columns}
						data={patients}
						loading={loading}
						emptyMessage={emptyMessage}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
