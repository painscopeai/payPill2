
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';

/** Decode JWT payload (browser only; signature verified on submit server-side). */
function readInviteEmailFromToken(token) {
  if (!token || typeof token !== 'string') return '';
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return '';
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload.applicantEmail === 'string' ? payload.applicantEmail.trim() : '';
  } catch {
    return '';
  }
}

export default function FormSubmissionPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const applicationToken = searchParams.get('application_token')?.trim() || '';

  const inviteEmailHint = useMemo(
    () => readInviteEmailFromToken(applicationToken),
    [applicationToken],
  );

  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const base = getApiBaseUrl().replace(/\/$/, '');
        const res = await fetch(`${base}/public/forms/${formId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText || 'Failed to load form');
        }
        const data = await res.json();
        setForm(data);
        setQuestions(data.questions || []);
        if (inviteEmailHint && data.collect_email !== false) {
          setEmail(inviteEmailHint);
        }
      } catch (err) {
        toast.error('Form not found or unavailable');
      } finally {
        setIsLoading(false);
      }
    };
    if (formId) fetchForm();
  }, [formId, inviteEmailHint]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId, option, checked) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      } else {
        return { ...prev, [questionId]: current.filter(o => o !== option) };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const effectiveEmail =
      applicationToken && inviteEmailHint
        ? inviteEmailHint
        : email || 'anonymous';

    // Basic validation
    if (form.collect_email !== false && !applicationToken && !email?.trim()) {
      toast.error('Email is required');
      return;
    }
    if (applicationToken && !inviteEmailHint) {
      toast.error('Invalid invitation link');
      return;
    }

    for (const q of questions) {
      if (q.required && (!answers[q.id] || (Array.isArray(answers[q.id]) && answers[q.id].length === 0))) {
        toast.error(`Please answer required question: ${q.question_text}`);
        return;
      }
    }

    setIsSubmitting(true);
    const controller = new AbortController();
    const timeoutMs = 45_000;
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const completionTime = Math.round((Date.now() - startTime) / 1000);
      const body = {
        respondent_email: effectiveEmail.trim(),
        responses_json: answers,
        completion_time_seconds: completionTime,
      };
      if (applicationToken) {
        body.provider_application_token = applicationToken;
      }
      const base = getApiBaseUrl().replace(/\/$/, '');
      const res = await fetch(`${base}/forms/${formId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText || 'Submit failed');
      }
      if (applicationToken) {
        navigate(
          `/provider-onboarding/services?application_token=${encodeURIComponent(applicationToken)}`,
          { replace: true },
        );
        return;
      }
      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error(`Request timed out after ${timeoutMs / 1000}s. Try again.`);
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to submit form.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!form) return <div className="flex h-screen items-center justify-center text-muted-foreground">Form not found</div>;

  const themeColor = form.theme_header_color || 'hsl(var(--primary))';

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-muted/30 py-12 px-4">
        <div className="max-w-3xl mx-auto bg-card rounded-2xl shadow-lg overflow-hidden border border-border">
          <div className="h-3 w-full" style={{ backgroundColor: themeColor }}></div>
          <div className="p-8 md:p-12 text-center space-y-4">
            <h1 className="text-3xl font-bold font-display">{form.name}</h1>
            <p className="text-muted-foreground text-lg">{form.confirmation_message || 'Your response has been recorded.'}</p>
            {form.allow_multiple_responses && (
              <Button variant="link" onClick={() => { setAnswers({}); setIsSubmitted(false); setEmail(''); }} className="mt-4">
                Submit another response
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-card rounded-2xl shadow-lg overflow-hidden border border-border">
        <div className="h-3 w-full" style={{ backgroundColor: themeColor }}></div>
        
        <div className="p-8 md:p-10 space-y-8">
          <div className="flex justify-center sm:justify-start">
            <PayPillLogo className="h-8 max-h-9 w-auto" />
          </div>
          <div className="space-y-3 border-b border-border pb-8">
            <h1 className="text-3xl font-bold font-display">{form.name}</h1>
            {form.description && <p className="text-muted-foreground whitespace-pre-wrap">{form.description}</p>}
            <p className="text-sm text-destructive mt-4">* Indicates required question</p>
          </div>

          {form.collect_email && (
            <div className="space-y-4 bg-card border border-border rounded-xl p-6 shadow-sm">
              <Label className="text-base font-medium flex items-start gap-1">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Your email" 
                className="max-w-md"
                readOnly={Boolean(applicationToken)}
                title={applicationToken ? 'Email is fixed for this invitation' : undefined}
              />
              {applicationToken ? (
                <p className="text-xs text-muted-foreground">This questionnaire was sent to your invited email address.</p>
              ) : null}
            </div>
          )}

          <div className="space-y-6">
            {questions.map((q, index) => (
              <div key={q.id} className="space-y-4 bg-card border border-border rounded-xl p-6 shadow-sm transition-colors focus-within:border-primary/50">
                <div className="space-y-1">
                  <Label className="text-base font-medium flex items-start gap-1">
                    {form.show_question_numbers && <span className="mr-1">{index + 1}.</span>}
                    {q.question_text}
                    {q.required && <span className="text-destructive">*</span>}
                  </Label>
                  {q.help_text && <p className="text-sm text-muted-foreground">{q.help_text}</p>}
                </div>
                
                <div className="pt-2">
                  {q.question_type === 'short_text' && (
                    <Input 
                      value={answers[q.id] || ''} 
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)} 
                      placeholder="Your answer" 
                      className="max-w-md"
                    />
                  )}
                  
                  {q.question_type === 'long_text' && (
                    <Textarea 
                      value={answers[q.id] || ''} 
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)} 
                      placeholder="Your answer" 
                      className="min-h-[100px]"
                    />
                  )}
                  
                  {q.question_type === 'multiple_choice' && (
                    <RadioGroup value={answers[q.id] || ''} onValueChange={(v) => handleAnswerChange(q.id, v)} className="space-y-3">
                      {(q.options_json || []).map((opt, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <RadioGroupItem value={opt} id={`q${q.id}-${i}`} />
                          <Label htmlFor={`q${q.id}-${i}`} className="font-normal cursor-pointer">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  
                  {q.question_type === 'checkboxes' && (
                    <div className="space-y-3">
                      {(q.options_json || []).map((opt, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <Checkbox 
                            id={`q${q.id}-${i}`} 
                            checked={(answers[q.id] || []).includes(opt)}
                            onCheckedChange={(c) => handleCheckboxChange(q.id, opt, c)}
                          />
                          <Label htmlFor={`q${q.id}-${i}`} className="font-normal cursor-pointer">{opt}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {q.question_type === 'dropdown' && (
                    <Select value={answers[q.id] || ''} onValueChange={(v) => handleAnswerChange(q.id, v)}>
                      <SelectTrigger className="max-w-md"><SelectValue placeholder="Choose" /></SelectTrigger>
                      <SelectContent>
                        {(q.options_json || []).map((opt, i) => (
                          <SelectItem key={i} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {q.question_type === 'linear_scale' && (
                    <div className="flex items-center gap-4 max-w-2xl overflow-x-auto pb-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">{q.validation_json?.minLabel}</span>
                      <RadioGroup value={answers[q.id] || ''} onValueChange={(v) => handleAnswerChange(q.id, v)} className="flex justify-between flex-1 gap-4">
                        {Array.from({length: (q.validation_json?.max || 5) - (q.validation_json?.min || 1) + 1}, (_, i) => (q.validation_json?.min || 1) + i).map(val => (
                          <div key={val} className="flex flex-col items-center gap-2">
                            <Label htmlFor={`scale-${q.id}-${val}`} className="font-normal cursor-pointer">{val}</Label>
                            <RadioGroupItem value={String(val)} id={`scale-${q.id}-${val}`} />
                          </div>
                        ))}
                      </RadioGroup>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">{q.validation_json?.maxLabel}</span>
                    </div>
                  )}
                  
                  {q.question_type === 'date' && (
                    <Input 
                      type="date" 
                      value={answers[q.id] || ''} 
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)} 
                      className="max-w-[200px]"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 flex justify-between items-center">
            <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: themeColor, color: '#fff' }} className="px-8">
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setAnswers({})}>
              Clear form
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
