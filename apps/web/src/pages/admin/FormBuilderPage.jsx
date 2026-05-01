
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiServerClient from '@/lib/apiServerClient';
import { supabase } from '@/lib/supabaseClient.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuestionBuilder } from '@/components/admin/forms/QuestionBuilder.jsx';
import { FormPreviewMode } from '@/components/admin/forms/FormPreviewMode.jsx';
import { FormTemplatesModal } from '@/components/admin/forms/FormTemplatesModal.jsx';
import { Plus, Eye, Settings, Palette, Save, Send, LayoutTemplate, ArrowLeft, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

async function formsAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

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
  const [activeTab, setActiveTab] = useState('questions');

  // Fetch forms list
  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await apiServerClient.fetch('/forms?limit=50', { headers: await formsAuthHeaders() });
        const data = await res.json();
        setForms(data.items || []);
        if (data.items?.length > 0 && !activeForm) {
          loadForm(data.items[0].id);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        toast.error('Failed to load forms');
        setIsLoading(false);
      }
    };
    fetchForms();
  }, []);

  const loadForm = async (id) => {
    setIsLoading(true);
    try {
      const res = await apiServerClient.fetch(`/forms/${id}`, { headers: await formsAuthHeaders() });
      const data = await res.json();
      setActiveForm(data);
      setQuestions(data.questions || []);
      if (data.questions?.length > 0) {
        setActiveQuestionId(data.questions[0].id);
      }
    } catch (err) {
      toast.error('Failed to load form details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateForm = async (template = null) => {
    try {
      const newForm = {
        name: template ? `Copy of ${template.name}` : 'Untitled Form',
        description: template?.desc || '',
        form_type: template?.category || 'custom',
      };
      const res = await apiServerClient.fetch('/forms', {
        method: 'POST',
        headers: await formsAuthHeaders(),
        body: JSON.stringify(newForm),
      });
      const created = await res.json();
      setForms([created, ...forms]);
      setActiveForm(created);
      setQuestions([]);
      setShowTemplates(false);
      
      // If template, we would ideally clone questions here. Mocking for now.
      if (template) {
        handleAddQuestion();
      }
    } catch (err) {
      toast.error('Failed to create form');
    }
  };

  const handleSaveForm = async () => {
    if (!activeForm) return;
    setIsSaving(true);
    try {
      // Save form details
      await apiServerClient.fetch(`/forms/${activeForm.id}`, {
        method: 'PUT',
        headers: await formsAuthHeaders(),
        body: JSON.stringify({
          name: activeForm.name,
          description: activeForm.description,
          form_type: activeForm.form_type,
          status: activeForm.status,
        }),
      });

      // Save questions (in a real app, we'd diff and send only changes, or backend handles bulk update)
      // For this implementation, we'll assume the backend handles individual question updates
      for (const q of questions) {
        if (q.isNew) {
          const { isNew, id, ...qData } = q;
          await apiServerClient.fetch(`/forms/${activeForm.id}/questions`, {
            method: 'POST',
            headers: await formsAuthHeaders(),
            body: JSON.stringify({
              question_text: qData.question_text,
              question_type: qData.question_type,
              options: qData.options,
              required: qData.required,
              order: qData.sort_order ?? qData.order,
            }),
          });
        } else {
          await apiServerClient.fetch(`/forms/${activeForm.id}/questions/${q.id}`, {
            method: 'PUT',
            headers: await formsAuthHeaders(),
            body: JSON.stringify(q)
          });
        }
      }
      
      toast.success('Form saved successfully');
      // Reload to get fresh IDs
      loadForm(activeForm.id);
    } catch (err) {
      toast.error('Failed to save form');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = () => {
    const newQ = {
      id: `temp_${Date.now()}`,
      isNew: true,
      form_id: activeForm.id,
      question_text: '',
      question_type: 'multiple_choice',
      options_json: ['Option 1'],
      required: false,
      order: questions.length
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionId(newQ.id);
  };

  const updateQuestion = (updatedQ) => {
    setQuestions(questions.map(q => q.id === updatedQ.id ? updatedQ : q));
  };

  const deleteQuestion = async (id) => {
    const q = questions.find(q => q.id === id);
    if (!q.isNew) {
      try {
        await apiServerClient.fetch(`/forms/${activeForm.id}/questions/${id}`, {
          method: 'DELETE',
          headers: await formsAuthHeaders(),
        });
      } catch (err) {
        toast.error('Failed to delete question');
        return;
      }
    }
    setQuestions(questions.filter(q => q.id !== id));
  };

  const moveQuestion = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === questions.length - 1)) return;
    const newQuestions = [...questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index + direction];
    newQuestions[index + direction] = temp;
    // Update order fields
    newQuestions.forEach((q, i) => q.order = i);
    setQuestions(newQuestions);
  };

  if (isPreviewMode && activeForm) {
    return <FormPreviewMode form={activeForm} questions={questions} onExit={() => setIsPreviewMode(false)} />;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-muted/10">
      {/* Left Sidebar - Form List */}
      <div className="w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-4">
          <Button className="w-full gap-2" onClick={() => handleCreateForm()}>
            <Plus className="w-4 h-4" /> Blank Form
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowTemplates(true)}>
            <LayoutTemplate className="w-4 h-4" /> Templates
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading && !activeForm ? (
            <div className="p-4 text-center"><LoadingSpinner size="sm" /></div>
          ) : (
            forms.map(f => (
              <button
                key={f.id}
                onClick={() => loadForm(f.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors truncate ${activeForm?.id === f.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                {f.name || 'Untitled Form'}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Center - Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeForm ? (
          <>
            {/* Toolbar */}
            <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-4">
                <Input 
                  value={activeForm.name} 
                  onChange={(e) => setActiveForm({...activeForm, name: e.target.value})}
                  className="font-display font-semibold text-lg border-transparent hover:border-border focus:border-primary bg-transparent w-64 h-9 px-2"
                />
                {isSaving && <span className="text-xs text-muted-foreground flex items-center gap-1"><LoadingSpinner size="xs" /> Saving...</span>}
                {!isSaving && <span className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Saved</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="toolbar-button" onClick={() => setActiveTab('theme')}>
                  <Palette className="w-4 h-4" /> Theme
                </Button>
                <Button variant="ghost" size="sm" className="toolbar-button" onClick={() => setIsPreviewMode(true)}>
                  <Eye className="w-4 h-4" /> Preview
                </Button>
                <Button variant="ghost" size="sm" className="toolbar-button" onClick={() => setActiveTab('settings')}>
                  <Settings className="w-4 h-4" /> Settings
                </Button>
                <div className="w-px h-6 bg-border mx-1"></div>
                <Button size="sm" className="gap-2 bg-primary-gradient" onClick={handleSaveForm} disabled={isSaving}>
                  <Save className="w-4 h-4" /> Save
                </Button>
                <Button size="sm" variant="secondary" className="gap-2" onClick={() => navigate(`/admin/forms/${activeForm.id}/responses`)}>
                  <Send className="w-4 h-4" /> Publish
                </Button>
              </div>
            </div>

            {/* Editor Canvas */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/30">
              <div className="max-w-3xl mx-auto space-y-6 pb-32">
                {/* Form Header Card */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm border-t-8 border-t-primary">
                  <Input 
                    value={activeForm.name} 
                    onChange={(e) => setActiveForm({...activeForm, name: e.target.value})}
                    placeholder="Form Title"
                    className="text-3xl font-bold font-display border-transparent hover:border-border focus:border-primary bg-transparent px-2 h-14 mb-2"
                  />
                  <Textarea 
                    value={activeForm.description || ''} 
                    onChange={(e) => setActiveForm({...activeForm, description: e.target.value})}
                    placeholder="Form Description"
                    className="border-transparent hover:border-border focus:border-primary bg-transparent px-2 resize-none min-h-[80px]"
                  />
                </div>

                {/* Questions List */}
                {questions.map((q, index) => (
                  <QuestionBuilder 
                    key={q.id} 
                    question={q} 
                    isActive={activeQuestionId === q.id}
                    onClick={() => setActiveQuestionId(q.id)}
                    onChange={updateQuestion}
                    onDelete={() => deleteQuestion(q.id)}
                    onDuplicate={() => {
                      const newQ = {...q, id: `temp_${Date.now()}`, isNew: true, order: index + 1};
                      const newQs = [...questions];
                      newQs.splice(index + 1, 0, newQ);
                      newQs.forEach((q, i) => q.order = i);
                      setQuestions(newQs);
                      setActiveQuestionId(newQ.id);
                    }}
                    onMoveUp={() => moveQuestion(index, -1)}
                    onMoveDown={() => moveQuestion(index, 1)}
                    isFirst={index === 0}
                    isLast={index === questions.length - 1}
                  />
                ))}

                {/* Add Question Button */}
                <div className="flex justify-center pt-4">
                  <Button variant="outline" className="gap-2 rounded-full shadow-sm bg-card" onClick={handleAddQuestion}>
                    <Plus className="w-4 h-4" /> Add Question
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a form or create a new one
          </div>
        )}
      </div>

      {/* Right Sidebar - Settings/Theme */}
      {activeForm && activeTab !== 'questions' && (
        <div className="w-80 border-l border-border bg-card flex flex-col shrink-0 animate-in slide-in-from-right-8 duration-200">
          <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
            <h3 className="font-medium">{activeTab === 'theme' ? 'Theme Customization' : 'Form Settings'}</h3>
            <Button variant="ghost" size="icon" onClick={() => setActiveTab('questions')} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {activeTab === 'theme' && (
              <>
                <div className="space-y-3">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    {['hsl(240 85% 55%)', 'hsl(142 71% 45%)', 'hsl(346 87% 43%)', 'hsl(270 85% 60%)', 'hsl(38 92% 50%)'].map(color => (
                      <button 
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${activeForm.theme_header_color === color ? 'border-foreground' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setActiveForm({...activeForm, theme_header_color: color})}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>Font Style</Label>
                  <Select defaultValue="sans">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sans">Sans Serif (Default)</SelectItem>
                      <SelectItem value="serif">Serif</SelectItem>
                      <SelectItem value="mono">Monospace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {activeTab === 'settings' && (
              <>
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Responses</h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="collect-email" className="font-normal">Collect email addresses</Label>
                    <Switch id="collect-email" checked={activeForm.collect_email} onCheckedChange={(c) => setActiveForm({...activeForm, collect_email: c})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="limit-one" className="font-normal">Limit to 1 response</Label>
                    <Switch id="limit-one" checked={!activeForm.allow_multiple_responses} onCheckedChange={(c) => setActiveForm({...activeForm, allow_multiple_responses: !c})} />
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Presentation</h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="progress-bar" className="font-normal">Show progress bar</Label>
                    <Switch id="progress-bar" checked={activeForm.show_progress_bar} onCheckedChange={(c) => setActiveForm({...activeForm, show_progress_bar: c})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="shuffle" className="font-normal">Shuffle question order</Label>
                    <Switch id="shuffle" checked={activeForm.shuffle_questions} onCheckedChange={(c) => setActiveForm({...activeForm, shuffle_questions: c})} />
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Confirmation</h4>
                  <div className="space-y-2">
                    <Label className="font-normal">Confirmation Message</Label>
                    <Textarea 
                      value={activeForm.confirmation_message || 'Your response has been recorded.'} 
                      onChange={(e) => setActiveForm({...activeForm, confirmation_message: e.target.value})}
                      className="text-sm"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <FormTemplatesModal 
        isOpen={showTemplates} 
        onClose={() => setShowTemplates(false)} 
        onSelectTemplate={handleCreateForm} 
      />
    </div>
  );
}
