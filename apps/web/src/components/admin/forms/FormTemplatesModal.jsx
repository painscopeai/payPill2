
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, ClipboardList, FileText, HeartPulse, ListOrdered, ShieldCheck, Stethoscope, Video } from 'lucide-react';
import { FORM_TEMPLATE_CATALOG } from '@/lib/formTemplateCatalog';

const ICONS = {
	patient_health_assessment: HeartPulse,
	employer_wellness: Activity,
	insurance_claim: ShieldCheck,
	provider_feedback: Stethoscope,
	provider_services_menu: ListOrdered,
	consent_treatment_general: FileText,
	consent_hipaa_acknowledgment: ShieldCheck,
	consent_telehealth: Video,
	service_intake_visit: ClipboardList,
};

export function FormTemplatesModal({
	isOpen,
	onClose,
	onSelectTemplate,
	isCreating,
	/** When set, only these template ids are listed (e.g. provider portal). */
	filterTemplateIds = null,
	title = 'Form Templates',
	description = null,
}) {
	const navigate = useNavigate();
	const templates = React.useMemo(() => {
		const all = Object.values(FORM_TEMPLATE_CATALOG);
		if (Array.isArray(filterTemplateIds) && filterTemplateIds.length > 0) {
			const allow = new Set(filterTemplateIds);
			return all.filter((t) => allow.has(t.id));
		}
		return all;
	}, [filterTemplateIds]);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						{description || (
							<>
								Choose a starter template. Most options create a new draft form you can edit and publish.
								<strong className="font-medium text-foreground"> Provider services &amp; pricing</strong> is a
								guide to onboarding—pricing is captured on the screen after questionnaire submit (not inside the
								form editor).
							</>
						)}
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
					{templates.map((template) => {
						const Icon = ICONS[template.id] || HeartPulse;
						const isInfoOnly = Boolean(template.infoOnly);
						const badgeLabel = isInfoOnly ? 'Built-in onboarding step' : `${template.questions.length} Questions`;
						return (
							<Card
								key={template.id}
								className={`transition-colors ${isInfoOnly ? 'border-muted-foreground/25 bg-muted/20' : 'hover:border-primary'}`}
							>
								<CardHeader className="pb-2">
									<div className="flex justify-between items-start">
										<div className="rounded-lg bg-primary/10 p-2 text-primary">
											<Icon className="h-5 w-5" />
										</div>
										<span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{badgeLabel}</span>
									</div>
									<CardTitle className="mt-3 text-base">{template.name}</CardTitle>
									<CardDescription className="text-sm">{template.description}</CardDescription>
								</CardHeader>
								<CardContent className={isInfoOnly ? 'flex flex-col gap-2' : ''}>
									{isInfoOnly ? (
										<>
											<Button
												variant="default"
												className="w-full gap-2"
												onClick={() => {
													onClose();
													navigate('/admin/providers');
												}}
											>
												Provider directory
											</Button>
											<Button
												variant="outline"
												className="w-full gap-2"
												onClick={() => {
													onClose();
													navigate('/admin/provider-services');
												}}
											>
												Service List (pricing rows)
											</Button>
											<Button
												variant="outline"
												className="w-full gap-2"
												onClick={() => {
													onClose();
													navigate('/admin/preview/provider-services-intake');
												}}
											>
												Preview applicant screen
											</Button>
										</>
									) : (
										<Button
											variant="secondary"
											className="w-full gap-2"
											disabled={isCreating}
											onClick={() => onSelectTemplate(template.id)}
										>
											Use template
										</Button>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			</DialogContent>
		</Dialog>
	);
}
