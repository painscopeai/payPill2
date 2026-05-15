import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { QuestionBuilder } from '@/components/admin/forms/QuestionBuilder.jsx';
import { FormPreviewMode } from '@/components/admin/forms/FormPreviewMode.jsx';
import { publicFormUrl } from '@/lib/publicFormUrl';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import {
	ArrowLeft,
	Copy,
	Eye,
	Loader2,
	Palette,
	Plus,
	Rocket,
	Save,
	Settings,
	Share2,
	Trash2,
	X,
} from 'lucide-react';

export default function ProviderFormBuilderPage() {
	const { formId } = useParams();
	const navigate = useNavigate();
	const [activeForm, setActiveForm] = useState(null);
	const [questions, setQuestions] = useState([]);
	const [activeQuestionId, setActiveQuestionId] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isPreviewMode, setIsPreviewMode] = useState(false);
	const [activeTab, setActiveTab] = useState('questions');
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [duplicateBusy, setDuplicateBusy] = useState(false);
	const [deletingForm, setDeletingForm] = useState(false);
	const [publishLinkDialogOpen, setPublishLinkDialogOpen] = useState(false);

	const loadForm = useCallback(async () => {
		if (!formId) return;
		setIsLoading(true);
		try {
			const res = await apiServerClient.fetch(`/provider/forms/${formId}`);
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to load form');
			}
			const data = await res.json();
			setActiveForm(data);
			setQuestions(data.questions || []);
			setActiveQuestionId(data.questions?.[0]?.id || null);
		} catch (err) {
			toast.error(err.message || 'Failed to load form');
			navigate('/provider/forms');
		} finally {
			setIsLoading(false);
		}
	}, [formId, navigate]);

	useEffect(() => {
		void loadForm();
	}, [loadForm]);

	const buildSyncPayload = () => {
		if (!activeForm) return null;
		return {
			form: {
				name: activeForm.name,
				description: activeForm.description ?? '',
				form_type: activeForm.form_type,
				status: activeForm.status || 'draft',
				category: activeForm.category ?? null,
				theme_header_color: activeForm.theme_header_color,
				collect_email: activeForm.collect_email,
				allow_multiple_responses: activeForm.allow_multiple_responses,
				confirmation_message: activeForm.confirmation_message,
				show_progress_bar: activeForm.show_progress_bar,
				shuffle_questions: activeForm.shuffle_questions,
				show_question_numbers: activeForm.show_question_numbers,
			},
			questions: questions.map((q, i) => ({
				question_text: q.question_text,
				question_type: q.question_type,
				options_json: q.options_json || [],
				required: q.required !== false,
				sort_order: typeof q.sort_order === 'number' ? q.sort_order : i,
				validation_json: q.question_type === 'linear_scale' ? q.validation_json || {} : undefined,
				config:
					q.question_type !== 'linear_scale' && q.config && typeof q.config === 'object'
						? q.config
						: undefined,
			})),
		};
	};

	const handleSaveForm = async () => {
		if (!activeForm) return;
		const payload = buildSyncPayload();
		if (!payload) return;
		setIsSaving(true);
		try {
			const res = await apiServerClient.fetch(`/provider/forms/${activeForm.id}/builder-sync`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Save failed');
			}
			const data = await res.json();
			setActiveForm(data.form);
			setQuestions(data.questions || []);
			toast.success('Form saved');
		} catch (err) {
			toast.error(err.message || 'Failed to save form');
		} finally {
			setIsSaving(false);
		}
	};

	const handlePublish = async () => {
		if (!activeForm) return;
		setIsSaving(true);
		try {
			const payload = buildSyncPayload();
			if (!payload) {
				setIsSaving(false);
				return;
			}
			payload.form.status = 'published';
			const res = await apiServerClient.fetch(`/provider/forms/${activeForm.id}/builder-sync`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Publish failed');
			}
			const data = await res.json();
			setActiveForm(data.form);
			setQuestions(data.questions || []);
			toast.success('Form published');
			setPublishLinkDialogOpen(true);
		} catch (err) {
			toast.error(err.message || 'Failed to publish');
		} finally {
			setIsSaving(false);
		}
	};

	const handleDuplicate = async () => {
		if (!activeForm) return;
		setDuplicateBusy(true);
		try {
			const res = await apiServerClient.fetch(`/provider/forms/${activeForm.id}/duplicate`, { method: 'POST' });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || 'Duplicate failed');
			const newId = body.form?.id;
			if (!newId) throw new Error('No new form id');
			toast.success('Copy created');
			navigate(`/provider/forms/builder/${newId}`);
		} catch (err) {
			toast.error(err.message || 'Duplicate failed');
		} finally {
			setDuplicateBusy(false);
		}
	};

	const handleDeleteForm = async () => {
		if (!activeForm) return;
		setDeletingForm(true);
		try {
			const res = await apiServerClient.fetch(`/provider/forms/${activeForm.id}`, { method: 'DELETE' });
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Delete failed');
			}
			toast.success('Form deleted');
			setDeleteConfirmOpen(false);
			navigate('/provider/forms');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete');
		} finally {
			setDeletingForm(false);
		}
	};

	const handleAddQuestion = () => {
		if (!activeForm) return;
		const newQ = {
			id: `temp_${Date.now()}`,
			isNew: true,
			form_id: activeForm.id,
			question_text: '',
			question_type: 'multiple_choice',
			options_json: ['Option 1'],
			required: false,
			sort_order: questions.length,
		};
		setQuestions([...questions, newQ]);
		setActiveQuestionId(newQ.id);
	};

	const updateQuestion = (updatedQ) => {
		setQuestions(questions.map((q) => (q.id === updatedQ.id ? updatedQ : q)));
	};

	const deleteQuestion = (id) => {
		setQuestions(questions.filter((q) => q.id !== id));
		if (activeQuestionId === id) setActiveQuestionId(null);
	};

	const moveQuestion = (index, direction) => {
		if (
			(direction === -1 && index === 0) ||
			(direction === 1 && index === questions.length - 1)
		) {
			return;
		}
		const newQuestions = [...questions];
		const temp = newQuestions[index];
		newQuestions[index] = newQuestions[index + direction];
		newQuestions[index + direction] = temp;
		newQuestions.forEach((q, i) => {
			q.sort_order = i;
		});
		setQuestions(newQuestions);
	};

	if (isPreviewMode && activeForm) {
		return <FormPreviewMode form={activeForm} questions={questions} onExit={() => setIsPreviewMode(false)} />;
	}

	if (isLoading || !activeForm) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(160deg,hsl(var(--muted)/0.35)_0%,hsl(var(--background))_45%,hsl(var(--muted)/0.2)_100%)] lg:min-h-[calc(100dvh-6.5rem)]">
			<Helmet>
				<title>{activeForm.name || 'Form'} — Provider</title>
			</Helmet>
			<div className="flex min-w-0 min-h-0 flex-1 flex-col bg-transparent">
				<header className="shrink-0 border-b border-border/80 bg-card/95 px-3 py-3 shadow-sm backdrop-blur-sm sm:px-4">
					<div className="mx-auto flex max-w-6xl flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<Button variant="ghost" size="sm" asChild className="gap-1">
								<Link to="/provider/forms">
									<ArrowLeft className="h-4 w-4" /> Forms
								</Link>
							</Button>
							<Badge variant="outline">{activeForm.form_type}</Badge>
						</div>
						<Input
							value={activeForm.name}
							onChange={(e) => setActiveForm({ ...activeForm, name: e.target.value })}
							className="h-10 w-full max-w-full border-transparent bg-transparent px-1 font-display text-xl font-semibold tracking-tight hover:border-border focus:border-primary md:text-2xl"
							placeholder="Form name"
						/>
						<div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
							<Button variant="ghost" size="sm" type="button" onClick={() => setActiveTab('theme')}>
								<Palette className="h-4 w-4" /> Theme
							</Button>
							<Button variant="ghost" size="sm" type="button" onClick={() => setIsPreviewMode(true)}>
								<Eye className="h-4 w-4" /> Preview
							</Button>
							<Button variant="ghost" size="sm" type="button" onClick={() => setActiveTab('settings')}>
								<Settings className="h-4 w-4" /> Settings
							</Button>
							<div className="mx-0.5 hidden h-6 w-px bg-border sm:block" />
							<Button
								variant="outline"
								size="sm"
								type="button"
								disabled={duplicateBusy}
								onClick={() => void handleDuplicate()}
							>
								<Copy className="mr-1 h-4 w-4" /> Duplicate
							</Button>
							<Button
								variant="outline"
								size="sm"
								type="button"
								className="text-destructive hover:bg-destructive/10"
								onClick={() => setDeleteConfirmOpen(true)}
							>
								<Trash2 className="mr-1 h-4 w-4" /> Delete
							</Button>
							<Button
								size="sm"
								className="gap-2 bg-primary-gradient shadow-sm"
								disabled={isSaving}
								type="button"
								onClick={() => void handleSaveForm()}
							>
								<Save className="h-4 w-4" /> Save
							</Button>
							<Button size="sm" variant="secondary" type="button" disabled={isSaving} onClick={() => void handlePublish()}>
								<Rocket className="h-4 w-4" /> Publish
							</Button>
							{activeForm.status === 'published' ? (
								<Button
									variant="outline"
									size="sm"
									type="button"
									onClick={() => {
										void navigator.clipboard.writeText(publicFormUrl(activeForm.id));
										toast.success('Public form link copied');
									}}
								>
									<Share2 className="mr-1 h-4 w-4" /> Copy link
								</Button>
							) : null}
						</div>
					</div>
				</header>

				<section className="shrink-0 border-b border-border/60 bg-muted/25 px-3 py-4 sm:px-4">
					<div className="mx-auto w-full max-w-6xl">
						<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
						<div className="grid gap-4 sm:max-w-xs">
							<div className="space-y-2">
								<Label className="text-xs text-muted-foreground">Publication</Label>
								<select
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									value={activeForm.status || 'draft'}
									onChange={(e) => setActiveForm({ ...activeForm, status: e.target.value })}
								>
									<option value="draft">Draft</option>
									<option value="published">Published</option>
								</select>
							</div>
						</div>
					</div>
				</section>

				<div className="flex min-h-0 flex-1 overflow-hidden">
					<div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(ellipse_at_top,hsl(var(--muted)/0.5)_0%,transparent_55%)] p-3 sm:p-5 md:p-8">
						<div className="mx-auto w-full max-w-4xl space-y-6 pb-32 xl:max-w-5xl 2xl:max-w-6xl">
							<div className="rounded-2xl border border-border/80 border-t-[6px] border-t-primary bg-card p-6 shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
								<Input
									value={activeForm.name}
									onChange={(e) => setActiveForm({ ...activeForm, name: e.target.value })}
									placeholder="Form Title"
									className="mb-2 h-14 border-transparent bg-transparent px-2 font-display text-3xl font-bold hover:border-border focus:border-primary"
								/>
								<Textarea
									value={activeForm.description || ''}
									onChange={(e) => setActiveForm({ ...activeForm, description: e.target.value })}
									placeholder="Form Description"
									className="min-h-[80px] resize-none border-transparent bg-transparent px-2 hover:border-border focus:border-primary"
								/>
							</div>

							{questions.map((q, index) => (
								<QuestionBuilder
									key={q.id}
									question={q}
									isActive={activeQuestionId === q.id}
									onClick={() => setActiveQuestionId(q.id)}
									onChange={updateQuestion}
									onDelete={() => deleteQuestion(q.id)}
									onDuplicate={() => {
										const newQ = {
											...q,
											id: `temp_${Date.now()}`,
											isNew: true,
											sort_order: index + 1,
										};
										const newQs = [...questions];
										newQs.splice(index + 1, 0, newQ);
										newQs.forEach((x, i) => {
											x.sort_order = i;
										});
										setQuestions(newQs);
										setActiveQuestionId(newQ.id);
									}}
									onMoveUp={() => moveQuestion(index, -1)}
									onMoveDown={() => moveQuestion(index, 1)}
									isFirst={index === 0}
									isLast={index === questions.length - 1}
								/>
							))}

							<div className="flex justify-center pt-4">
								<Button variant="outline" type="button" className="gap-2 rounded-full bg-card shadow-sm" onClick={handleAddQuestion}>
									<Plus className="h-4 w-4" /> Add Question
								</Button>
							</div>
						</div>
					</div>

					{activeForm && activeTab !== 'questions' && (
						<div className="flex w-full max-w-[min(20rem,92vw)] shrink-0 animate-in slide-in-from-right-8 flex-col border-l border-border bg-card duration-200 sm:max-w-none md:w-72 lg:w-80">
							<div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
								<h3 className="font-medium">{activeTab === 'theme' ? 'Theme' : 'Settings'}</h3>
								<Button variant="ghost" size="icon" type="button" className="h-8 w-8" onClick={() => setActiveTab('questions')}>
									<X className="h-4 w-4" />
								</Button>
							</div>
							<div className="flex-1 space-y-6 overflow-y-auto p-4">
								{activeTab === 'theme' && (
									<div className="space-y-3">
										<Label>Primary color</Label>
										<div className="flex flex-wrap gap-2">
											{[
												'hsl(221 83% 53%)',
												'hsl(142 71% 45%)',
												'hsl(346 87% 43%)',
												'hsl(270 85% 60%)',
												'hsl(38 92% 50%)',
											].map((color) => (
												<button
													key={color}
													type="button"
													className={`h-8 w-8 rounded-full border-2 ${activeForm.theme_header_color === color ? 'border-foreground' : 'border-transparent'}`}
													style={{ backgroundColor: color }}
													onClick={() => setActiveForm({ ...activeForm, theme_header_color: color })}
												/>
											))}
										</div>
									</div>
								)}
								{activeTab === 'settings' && (
									<>
										<div className="space-y-4">
											<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responses</h4>
											<div className="flex items-center justify-between">
												<Label htmlFor="collect-email" className="font-normal">
													Collect email addresses
												</Label>
												<Switch
													id="collect-email"
													checked={activeForm.collect_email !== false}
													onCheckedChange={(c) => setActiveForm({ ...activeForm, collect_email: c })}
												/>
											</div>
											<div className="flex items-center justify-between">
												<Label htmlFor="limit-one" className="font-normal">
													Allow multiple responses
												</Label>
												<Switch
													id="limit-one"
													checked={activeForm.allow_multiple_responses === true}
													onCheckedChange={(c) => setActiveForm({ ...activeForm, allow_multiple_responses: c })}
												/>
											</div>
										</div>
										<div className="space-y-4 border-t border-border pt-4">
											<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Presentation</h4>
											<div className="flex items-center justify-between">
												<Label className="font-normal">Show progress bar</Label>
												<Switch
													checked={activeForm.show_progress_bar === true}
													onCheckedChange={(c) => setActiveForm({ ...activeForm, show_progress_bar: c })}
												/>
											</div>
											<div className="flex items-center justify-between">
												<Label className="font-normal">Shuffle question order</Label>
												<Switch
													checked={activeForm.shuffle_questions === true}
													onCheckedChange={(c) => setActiveForm({ ...activeForm, shuffle_questions: c })}
												/>
											</div>
											<div className="flex items-center justify-between">
												<Label className="font-normal">Show question numbers</Label>
												<Switch
													checked={activeForm.show_question_numbers !== false}
													onCheckedChange={(c) => setActiveForm({ ...activeForm, show_question_numbers: c })}
												/>
											</div>
										</div>
										<div className="space-y-4 border-t border-border pt-4">
											<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirmation</h4>
											<div className="space-y-2">
												<Label className="font-normal">Confirmation message</Label>
												<Textarea
													value={activeForm.confirmation_message || 'Your response has been recorded.'}
													onChange={(e) => setActiveForm({ ...activeForm, confirmation_message: e.target.value })}
													className="text-sm"
												/>
											</div>
										</div>
									</>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			<Dialog open={publishLinkDialogOpen} onOpenChange={setPublishLinkDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Form published</DialogTitle>
						<DialogDescription>Share this link with respondents or attach the form to a catalog service.</DialogDescription>
					</DialogHeader>
					{activeForm ? (
						<div className="space-y-3">
							<Input readOnly value={publicFormUrl(activeForm.id)} className="font-mono text-xs" />
							<DialogFooter className="gap-2 sm:justify-between">
								<Button type="button" variant="outline" onClick={() => setPublishLinkDialogOpen(false)}>
									Close
								</Button>
								<Button
									type="button"
									onClick={() => {
										void navigator.clipboard.writeText(publicFormUrl(activeForm.id));
										toast.success('Link copied');
									}}
								>
									<Share2 className="mr-2 h-4 w-4" /> Copy link
								</Button>
							</DialogFooter>
						</div>
					) : null}
				</DialogContent>
			</Dialog>

			<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this form?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the form and all questions and responses. Service attachments will be removed automatically.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deletingForm}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={deletingForm}
							onClick={(e) => {
								e.preventDefault();
								void handleDeleteForm();
							}}
						>
							{deletingForm ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Deleting…
								</>
							) : (
								'Delete'
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
