import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppointments } from '@/hooks/useAppointments.js';
import ProviderDataTable from '@/components/provider/ProviderDataTable.jsx';
import StatusBadge from '@/components/StatusBadge.jsx';
import { FileText, User, Video } from 'lucide-react';
import { TableRowActionsMenu } from '@/components/TableRowActionsMenu.jsx';

function formatDateLabel(raw) {
	if (!raw) return '—';
	const d = new Date(`${raw}T12:00:00`);
	if (Number.isNaN(d.getTime())) return String(raw);
	return d.toLocaleDateString();
}

function appointmentDateTimeKey(apt) {
	const d = String(apt?.appointment_date || '');
	const t = String(apt?.appointment_time || '00:00:00').slice(0, 8);
	return `${d}T${t}`;
}

export default function ProviderAppointmentsPage() {
	const { appointments, loading } = useAppointments();

	const rows = useMemo(() => {
		const mapped = (appointments || []).map((apt) => ({
			...apt,
			visit_type: apt.appointment_type || apt.type || 'consultation',
			patient_sort: apt.patient_name || 'Patient',
			reason_sort: (apt.reason && String(apt.reason).trim()) || '—',
		}));
		return mapped.sort((a, b) => appointmentDateTimeKey(b).localeCompare(appointmentDateTimeKey(a)));
	}, [appointments]);

	const columns = useMemo(
		() => [
			{
				key: 'appointment_date',
				label: 'Date',
				sortable: true,
				render: (row) => <span className="whitespace-nowrap font-medium">{formatDateLabel(row.appointment_date)}</span>,
			},
			{
				key: 'appointment_time',
				label: 'Time',
				sortable: true,
				render: (row) => <span className="whitespace-nowrap">{row.appointment_time || '—'}</span>,
			},
			{
				key: 'patient_sort',
				label: 'Patient',
				sortable: true,
				render: (row) => {
					const uid = row.user_id || row.userId;
					const name = row.patient_name || 'Patient';
					if (!uid) return <span className="font-medium">{name}</span>;
					return (
						<Link
							to={`/provider/patients/${encodeURIComponent(String(uid))}`}
							className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
						>
							{name}
						</Link>
					);
				},
			},
			{
				key: 'visit_type',
				label: 'Visit type',
				sortable: true,
				render: (row) => (
					<span className="inline-flex items-center gap-1.5 capitalize text-sm text-muted-foreground">
						{row.visit_type === 'telemedicine' ? <Video className="h-3.5 w-3.5 shrink-0" /> : <User className="h-3.5 w-3.5 shrink-0" />}
						{row.visit_type}
					</span>
				),
			},
			{
				key: 'reason_sort',
				label: 'Reason',
				sortable: true,
				render: (row) => (
					<span className="text-sm text-muted-foreground max-w-[280px] line-clamp-2">
						{row.reason && String(row.reason).trim() ? row.reason : '—'}
					</span>
				),
			},
			{
				key: 'status',
				label: 'Status',
				sortable: true,
				render: (row) => <StatusBadge status={row.status} />,
			},
			{
				key: 'actions',
				label: '',
				sortable: false,
				className: 'w-[120px]',
				render: (row) => {
					const uid = row.user_id || row.userId;
					if (!uid) return <span className="text-xs text-muted-foreground">—</span>;
					return (
						<TableRowActionsMenu
							items={[
								{
									label: 'Chart',
									icon: FileText,
									href: `/provider/patients/${encodeURIComponent(String(uid))}`,
									className: 'text-teal-700 dark:text-teal-300',
								},
							]}
						/>
					);
				},
			},
		],
		[],
	);

	const emptyMessage = (
		<div className="py-4 px-2 max-w-lg mx-auto text-left text-sm">
			<p className="font-medium text-foreground">No appointments for your linked practice.</p>
			<p className="mt-2 text-muted-foreground leading-relaxed">
				Bookings appear here when patients schedule against your organization. Confirm onboarding linked the correct practice org.
			</p>
		</div>
	);

	return (
		<div className="w-full space-y-8">
			<Helmet>
				<title>Schedule - PayPill</title>
			</Helmet>
			<h1 className="text-3xl font-bold tracking-tight">Appointment schedule</h1>

			<Card className="shadow-sm border-border/50">
				<CardHeader>
					<CardTitle>Upcoming &amp; recent bookings</CardTitle>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<ProviderDataTable
						columns={columns}
						data={rows}
						isLoading={loading}
						emptyMessage={emptyMessage}
						getRowId={(r) => String(r.id ?? '')}
						defaultSortKey="appointment_date"
						defaultSortDesc
					/>
				</CardContent>
			</Card>
		</div>
	);
}
