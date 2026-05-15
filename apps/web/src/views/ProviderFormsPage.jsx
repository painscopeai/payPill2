import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FormTemplatesModal } from '@/components/admin/forms/FormTemplatesModal.jsx';
import { PROVIDER_PORTAL_TEMPLATE_IDS } from '@/lib/formTemplateCatalog';
import { publicFormUrl } from '@/lib/publicFormUrl';
import { toast } from 'sonner';
import { ClipboardList, FileText, LayoutTemplate, Loader2, Pencil, Plus, Settings2 } from 'lucide-react';

export default function ProviderFormsPage() {
	const navigate = useNavigate();
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showTemplates, setShowTemplates] = useState(false);
	const [templateBusy, setTemplateBusy] = useState(false);
	const [creating, setCreating] = useState(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await apiServerClient.fetch('/provider/forms?limit=100');
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Failed to load forms');
			setItems(body.items || []);
		} catch (e) {
			toast.error(e.message || 'Failed to load forms');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const createBlank = async (form_type) => {
		setCreating(form_type);
		try {
			const name = form_type === 'consent' ? 'Untitled consent' : 'Untitled intake';
			const res = await apiServerClient.fetch('/provider/forms', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					form_type,
					description: '',
					category: form_type === 'consent' ? 'Consent' : 'Intake',
				}),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Create failed');
			toast.success('Draft created');
			navigate(`/provider/forms/builder/${body.id}`);
		} catch (e) {
			toast.error(e.message || 'Create failed');
		} finally {
			setCreating(null);
		}
	};

	const onTemplate = async (templateId) => {
		setTemplateBusy(true);
		try {
			const res = await apiServerClient.fetch('/provider/forms/from-template', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ templateId }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Template failed');
			setShowTemplates(false);
			const id = body.form?.id;
			if (!id) throw new Error('No form id returned');
			toast.success('Template added — edit and publish when ready');
			navigate(`/provider/forms/builder/${id}`);
		} catch (e) {
			toast.error(e.message || 'Template failed');
		} finally {
			setTemplateBusy(false);
		}
	};

	return (
		<div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
			<Helmet>
				<title>Forms — Provider</title>
			</Helmet>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Forms</h1>
					<p className="mt-2 text-muted-foreground max-w-2xl">
						Build consent and service intake questionnaires, publish them, then attach each to a row in{' '}
						<Link className="text-primary underline-offset-4 hover:underline" to="/provider/settings/catalog/services">
							Settings → Services catalog
						</Link>
						. Patients see published links when they pick that service during booking.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" className="gap-2" onClick={() => setShowTemplates(true)}>
						<LayoutTemplate className="h-4 w-4" />
						Templates
					</Button>
					<Button
						type="button"
						className="gap-2"
						disabled={!!creating}
						onClick={() => void createBlank('consent')}
					>
						{creating === 'consent' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
						New consent
					</Button>
					<Button
						type="button"
						variant="secondary"
						className="gap-2"
						disabled={!!creating}
						onClick={() => void createBlank('service_intake')}
					>
						{creating === 'service_intake' ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<ClipboardList className="h-4 w-4" />
						)}
						New intake
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Your forms</CardTitle>
					<CardDescription>Drafts stay private until you publish. Only published forms appear to patients on linked services.</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex justify-center py-12 text-muted-foreground">
							<Loader2 className="h-8 w-8 animate-spin" />
						</div>
					) : items.length === 0 ? (
						<p className="py-8 text-center text-muted-foreground">No forms yet. Create one or start from a template.</p>
					) : (
						<ul className="divide-y rounded-lg border">
							{items.map((f) => (
								<li key={f.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
									<div className="min-w-0 space-y-1">
										<p className="truncate font-medium">{f.name || 'Untitled'}</p>
										<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
											<Badge variant={f.status === 'published' ? 'default' : 'outline'}>{f.status || 'draft'}</Badge>
											<span>{f.form_type}</span>
											{f.category ? <span>· {f.category}</span> : null}
										</div>
									</div>
									<div className="flex shrink-0 flex-wrap gap-2">
										{f.status === 'published' ? (
											<Button variant="outline" size="sm" asChild>
												<a href={publicFormUrl(f.id)} target="_blank" rel="noopener noreferrer">
													Open public link
												</a>
											</Button>
										) : null}
										<Button size="sm" className="gap-1" asChild>
											<Link to={`/provider/forms/builder/${f.id}`}>
												<Pencil className="h-3.5 w-3.5" /> Edit
											</Link>
										</Button>
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Settings2 className="h-4 w-4" />
						Assign to services
					</CardTitle>
					<CardDescription>
						After publishing, open the services catalog and use &quot;Forms&quot; on each row to attach consent and intake
						forms.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button variant="outline" asChild>
						<Link to="/provider/settings/catalog/services">
							<Plus className="mr-2 h-4 w-4" />
							Go to services catalog
						</Link>
					</Button>
				</CardContent>
			</Card>

			<FormTemplatesModal
				isOpen={showTemplates}
				onClose={() => setShowTemplates(false)}
				onSelectTemplate={(id) => void onTemplate(id)}
				isCreating={templateBusy}
				filterTemplateIds={[...PROVIDER_PORTAL_TEMPLATE_IDS]}
				title="Provider templates"
				description="Starter consent and intake layouts. Each creates your own draft copy you can edit, publish, and attach to services."
			/>
		</div>
	);
}
