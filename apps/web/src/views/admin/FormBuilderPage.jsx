
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient';
import { VALID_FORM_TYPES } from '@/lib/validFormTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { QuestionBuilder } from '@/components/admin/forms/QuestionBuilder.jsx';
import { FormPreviewMode } from '@/components/admin/forms/FormPreviewMode.jsx';
import { FormTemplatesModal } from '@/components/admin/forms/FormTemplatesModal.jsx';
import {
  Plus,
  Eye,
  Settings,
  Palette,
  Save,
  Send,
  LayoutTemplate,
  CheckCircle2,
  X,
  Search,
  Copy,
  Trash2,
  Rocket,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { Badge } from '@/components/ui/badge.jsx';

async function formsAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

const CATEGORY_PRESETS = ['Intake', 'Employer', 'Insurance', 'Provider', 'Surveys', 'Custom'];

export default function FormBuilderPage() {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [activeForm, setActiveForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('questions');
  const [listSearch, setListSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [duplicateBusy, setDuplicateBusy] = useState(false);
  const [creatingBlank, setCreatingBlank] = useState(false);
  const [deletingForm, setDeletingForm] = useState(false);

  const loadForm = useCallback(async (id) => {
    setIsLoading(true);
    try {
      const res = await apiServerClient.fetch(`/forms/${id}`, { headers: await formsAuthHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load form');
      }
      const data = await res.json();
      setActiveForm(data);
      setQuestions(data.questions || []);
      if (data.questions?.length > 0) {
        setActiveQuestionId(data.questions[0].id);
      } else {
        setActiveQuestionId(null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load form details');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchForms = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiServerClient.fetch('/forms?limit=100', { headers: await formsAuthHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load forms');
      }
      const data = await res.json();
      const items = data.items || [];
      setForms(items);
      if (items.length > 0) {
        await loadForm(items[0].id);
      } else {
        setActiveForm(null);
        setQuestions([]);
        setActiveQuestionId(null);
        setIsLoading(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load forms');
      setIsLoading(false);
    }
  }, [loadForm]);

  useEffect(() => {
    void fetchForms();
  }, [fetchForms]);

  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      const q = listSearch.trim().toLowerCase();
      const name = (f.name || '').toLowerCase();
      const cat = (f.category || '').toLowerCase();
      const matchSearch = !q || name.includes(q) || cat.includes(q);
      const matchCat = !categoryFilter || (f.category || '') === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [forms, listSearch, categoryFilter]);

  const handleCreateBlank = async () => {
    setCreatingBlank(true);
    try {
      const res = await apiServerClient.fetch('/forms', {
        method: 'POST',
        headers: await formsAuthHeaders(),
        body: JSON.stringify({
          name: 'Untitled Form',
          form_type: 'custom',
          description: '',
          category: 'Custom',
          settings: {
            collect_email: true,
            allow_multiple_responses: false,
            theme_header_color: 'hsl(221 83% 53%)',
            confirmation_message: 'Your response has been recorded.',
            show_progress_bar: false,
            shuffle_questions: false,
            show_question_numbers: true,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.error || err.message || res.statusText;
        throw new Error(typeof detail === 'string' ? detail : 'Failed to create form');
      }
      const created = await res.json();
      await fetchForms();
      await loadForm(created.id);
      toast.success('New form created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create form');
    } finally {
      setCreatingBlank(false);
    }
  };

  const handleSelectTemplate = async (templateId) => {
    setTemplateBusy(true);
    try {
      const res = await apiServerClient.fetch('/forms/from-template', {
        method: 'POST',
        headers: await formsAuthHeaders(),
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create from template');
      }
      const data = await res.json();
      setShowTemplates(false);
      await fetchForms();
      await loadForm(data.form.id);
      toast.success('Template added — edit and publish when ready');
    } catch (err) {
      toast.error(err.message || 'Failed to use template');
    } finally {
      setTemplateBusy(false);
    }
  };

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
      const res = await apiServerClient.fetch(`/forms/${activeForm.id}/builder-sync`, {
        method: 'PUT',
        headers: await formsAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      const data = await res.json();
      setActiveForm(data.form);
      setQuestions(data.questions || []);
      await fetchForms();
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
      const res = await apiServerClient.fetch(`/forms/${activeForm.id}/builder-sync`, {
        method: 'PUT',
        headers: await formsAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Publish failed');
      }
      const data = await res.json();
      setActiveForm(data.form);
      setQuestions(data.questions || []);
      await fetchForms();
      toast.success('Form published — respondents can open the public link');
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
      const res = await apiServerClient.fetch('/forms', {
        method: 'POST',
        headers: await formsAuthHeaders(),
        body: JSON.stringify({
          name: `Copy of ${activeForm.name}`,
          form_type: activeForm.form_type,
          description: activeForm.description || '',
          category: activeForm.category || '',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Duplicate failed');
      }
      const created = await res.json();
      const syncPayload = buildSyncPayload();
      if (!syncPayload) throw new Error('Nothing to copy');
      const syncRes = await apiServerClient.fetch(`/forms/${created.id}/builder-sync`, {
        method: 'PUT',
        headers: await formsAuthHeaders(),
        body: JSON.stringify({
          form: {
            ...syncPayload.form,
            name: `Copy of ${activeForm.name}`,
            status: 'draft',
          },
          questions: syncPayload.questions,
        }),
      });
      if (!syncRes.ok) {
        const err = await syncRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to copy questions');
      }
      await fetchForms();
      await loadForm(created.id);
      toast.success('Duplicate created');
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
      const res = await apiServerClient.fetch(`/forms/${activeForm.id}`, {
        method: 'DELETE',
        headers: await formsAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.error || err.message || res.statusText;
        throw new Error(typeof detail === 'string' ? detail : 'Delete failed');
      }
      toast.success('Form deleted');
      setDeleteConfirmOpen(false);
      await fetchForms();
      setActiveForm(null);
      setQuestions([]);
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
    if (activeQuestionId === id) {
      setActiveQuestionId(null);
    }
  };

  const moveQuestion = (index, direction) => {
    if (
      (direction === -1 && index === 0) ||
      (direction === 1 && index === questions.length - 1)
    )
      return;
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
    return (
      <FormPreviewMode form={activeForm} questions={questions} onExit={() => setIsPreviewMode(false)} />
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[linear-gradient(160deg,hsl(var(--muted)/0.35)_0%,hsl(var(--background))_45%,hsl(var(--muted)/0.2)_100%)]">
      <div className="flex w-72 shrink-0 flex-col border-r border-border/80 bg-card/95 shadow-sm backdrop-blur-sm">
        <div className="space-y-3 border-b border-border/80 p-4">
          <Button
            className="w-full gap-2 shadow-sm"
            type="button"
            disabled={creatingBlank}
            onClick={() => void handleCreateBlank()}
          >
            {creatingBlank ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Blank form
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            type="button"
            onClick={() => setShowTemplates(true)}
          >
            <LayoutTemplate className="h-4 w-4" /> Templates
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search forms…"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="bg-background pl-9"
            />
          </div>
          <Select value={categoryFilter || '__all__'} onValueChange={(v) => setCategoryFilter(v === '__all__' ? '' : v)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {CATEGORY_PRESETS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-2">
          {isLoading && !activeForm ? (
            <div className="p-4 text-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            filteredForms.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => void loadForm(f.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                  activeForm?.id === f.id
                    ? 'border-primary/40 bg-primary/[0.07] font-medium text-foreground shadow-sm ring-1 ring-primary/20'
                    : 'border-transparent bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="block truncate">{f.name || 'Untitled Form'}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  {f.status === 'published' ? (
                    <Badge variant="secondary" className="text-[10px] font-normal uppercase tracking-wide">
                      Live
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-normal uppercase tracking-wide">
                      Draft
                    </Badge>
                  )}
                  {(f.category || f.form_type) && (
                    <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                      {[f.category, f.form_type].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-transparent">
        {activeForm ? (
          <>
            <header className="shrink-0 border-b border-border/80 bg-card/95 px-4 py-3 shadow-sm backdrop-blur-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Input
                    value={activeForm.name}
                    onChange={(e) => setActiveForm({ ...activeForm, name: e.target.value })}
                    className="h-10 border-transparent bg-transparent px-1 font-display text-xl font-semibold tracking-tight hover:border-border focus:border-primary md:text-2xl"
                    placeholder="Form name"
                  />
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                        <span className="min-w-0">
                          Edits are kept in this session only — <span className="font-medium text-foreground/80">Save</span> to update the server.
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
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
                  <Button size="sm" className="gap-2 bg-primary-gradient shadow-sm" disabled={isSaving} type="button" onClick={() => void handleSaveForm()}>
                    <Save className="h-4 w-4" /> Save
                  </Button>
                  <Button size="sm" variant="secondary" type="button" disabled={isSaving} onClick={() => void handlePublish()}>
                    <Rocket className="h-4 w-4" /> Publish
                  </Button>
                  <Button size="sm" variant="outline" type="button" asChild>
                    <Link to={`/admin/forms/${activeForm.id}/responses`}>
                      <Send className="mr-1 h-4 w-4" /> Responses
                    </Link>
                  </Button>
                </div>
              </div>
            </header>

            <section className="shrink-0 border-b border-border/60 bg-muted/25 px-4 py-4">
              <div className="mx-auto max-w-3xl">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Form details</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Select
                      value={activeForm.form_type || 'custom'}
                      onValueChange={(v) => setActiveForm({ ...activeForm, form_type: v })}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_FORM_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <Input
                      value={activeForm.category || ''}
                      onChange={(e) => setActiveForm({ ...activeForm, category: e.target.value })}
                      placeholder="e.g. Intake"
                      className="h-10 bg-background"
                      list="form-category-presets"
                    />
                    <datalist id="form-category-presets">
                      {CATEGORY_PRESETS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select
                      value={activeForm.status || 'draft'}
                      onValueChange={(v) => setActiveForm({ ...activeForm, status: v })}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,hsl(var(--muted)/0.5)_0%,transparent_55%)] p-4 md:p-8">
                <div className="mx-auto max-w-3xl space-y-6 pb-32">
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
                <div className="flex w-80 shrink-0 animate-in slide-in-from-right-8 flex-col border-l border-border bg-card duration-200">
                  <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
                    <h3 className="font-medium">{activeTab === 'theme' ? 'Theme' : 'Settings'}</h3>
                    <Button variant="ghost" size="icon" type="button" className="h-8 w-8" onClick={() => setActiveTab('questions')}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 space-y-6 overflow-y-auto p-4">
                    {activeTab === 'theme' && (
                      <>
                        <div className="space-y-3">
                          <Label>Primary color</Label>
                          <div className="flex gap-2">
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
                      </>
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
          </>
        ) : (
          <div className="text-muted-foreground flex flex-1 items-center justify-center">
            Select a form or create a new one
          </div>
        )}
      </div>

      <FormTemplatesModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleSelectTemplate}
        isCreating={templateBusy}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this form?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the form and all questions and responses. This cannot be undone.
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
