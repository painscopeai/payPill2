import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, FileText } from 'lucide-react';
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

export default function PatientCard({ patient }) {
	const cov = patient.coverage_summary;
	const displayName = formatPersonDisplayName(patient.patient_name || 'Patient');
	const linked = patient.linked_via || [];
	const showAssigned = linked.includes('relationship');
	const showBooked = linked.includes('appointment');
	const showNotes = linked.includes('clinical_note');
	const showRx = linked.includes('prescription');
	const showTele = linked.includes('telemedicine');
	const showEncounter = linked.includes('consultation_encounter');
	const activityLabel = patient.patient_activity_status || (showBooked ? 'Has appointments' : 'Patient');
	const activityKind = patient.patient_activity_kind || '';

	return (
		<Link to={`/provider/patients/${patient.patient_id}`} className="block text-inherit no-underline rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
			<Card className="h-full cursor-pointer border-border/80 shadow-sm transition-colors hover:border-teal-500/35 hover:bg-muted/25">
				<CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-4 min-w-0">
						<div className="h-11 w-11 rounded-full bg-teal-500/15 flex items-center justify-center text-teal-800 dark:text-teal-200 font-semibold text-sm shrink-0">
							{displayName ? displayName.substring(0, 2).toUpperCase() : 'PT'}
						</div>
						<div className="min-w-0">
							<h4 className="font-semibold text-foreground truncate">{displayName || 'Patient'}</h4>
							<div className="mt-2">
								<Badge
									variant={activityBadgeVariant(activityKind)}
									className="text-[11px] font-medium leading-snug max-w-full whitespace-normal text-left h-auto py-1 px-2"
								>
									{activityLabel}
								</Badge>
							</div>
							<div className="flex flex-wrap gap-1.5 mt-1.5">
								{showAssigned ? (
									<Badge variant="secondary" className="text-[10px] font-medium uppercase tracking-wide">
										Care team
									</Badge>
								) : null}
								{showBooked ? (
									<Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide border-teal-500/40">
										Booked
									</Badge>
								) : null}
								{showNotes ? (
									<Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">
										Notes
									</Badge>
								) : null}
								{showRx ? (
									<Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">
										Rx
									</Badge>
								) : null}
								{showTele ? (
									<Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">
										Video
									</Badge>
								) : null}
								{showEncounter ? (
									<Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">
										Consult
									</Badge>
								) : null}
							</div>
							{cov ? (
								<p className="text-xs text-muted-foreground mt-2 line-clamp-2">
									{cov.coverage_type === 'employer' ? 'Employee' : 'Walk-in'}
									{cov.insurance_label ? ` · ${cov.insurance_label}` : ''}
									{cov.employer_name ? ` · ${cov.employer_name}` : ''}
								</p>
							) : (
								<p className="text-xs text-muted-foreground mt-2">Coverage not on file</p>
							)}
						</div>
					</div>
					<div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60">
						<span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 dark:text-teal-300">
							<FileText className="h-4 w-4" />
							View chart
						</span>
						<ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block" aria-hidden />
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
