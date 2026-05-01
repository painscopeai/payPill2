
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, UploadCloud } from 'lucide-react';

export function FormPreviewMode({ form, questions, onExit }) {
  const themeColor = form.theme_header_color || 'hsl(var(--primary))';

  const renderQuestionInput = (q) => {
    switch (q.question_type) {
      case 'short_text':
        return <Input placeholder="Your answer" className="max-w-md" />;
      case 'long_text':
        return <Textarea placeholder="Your answer" className="min-h-[100px]" />;
      case 'multiple_choice':
        return (
          <RadioGroup className="space-y-3">
            {(q.options_json || []).map((opt, i) => (
              <div key={i} className="flex items-center space-x-3">
                <RadioGroupItem value={opt} id={`q${q.id}-${i}`} />
                <Label htmlFor={`q${q.id}-${i}`} className="font-normal">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case 'checkboxes':
        return (
          <div className="space-y-3">
            {(q.options_json || []).map((opt, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Checkbox id={`q${q.id}-${i}`} />
                <Label htmlFor={`q${q.id}-${i}`} className="font-normal">{opt}</Label>
              </div>
            ))}
          </div>
        );
      case 'dropdown':
        return (
          <Select>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent>
              {(q.options_json || []).map((opt, i) => (
                <SelectItem key={i} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'linear_scale':
        const min = q.validation_json?.min || 1;
        const max = q.validation_json?.max || 5;
        const range = Array.from({length: max - min + 1}, (_, i) => min + i);
        return (
          <div className="flex items-center gap-4 max-w-2xl">
            <span className="text-sm text-muted-foreground">{q.validation_json?.minLabel}</span>
            <RadioGroup className="flex justify-between flex-1">
              {range.map(val => (
                <div key={val} className="flex flex-col items-center gap-2">
                  <Label htmlFor={`scale-${q.id}-${val}`} className="font-normal">{val}</Label>
                  <RadioGroupItem value={String(val)} id={`scale-${q.id}-${val}`} />
                </div>
              ))}
            </RadioGroup>
            <span className="text-sm text-muted-foreground">{q.validation_json?.maxLabel}</span>
          </div>
        );
      case 'date':
        return <Input type="date" className="max-w-[200px]" />;
      case 'time':
        return <Input type="time" className="max-w-[150px]" />;
      case 'file_upload':
        return (
          <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center max-w-md hover:bg-muted/50 transition-colors cursor-pointer">
            <UploadCloud className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">SVG, PNG, JPG or PDF (max. 10MB)</p>
          </div>
        );
      default:
        return <p className="text-sm text-muted-foreground italic">Unsupported question type</p>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-background border-b border-border sticky top-0 z-10 px-4 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onExit} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Editor
          </Button>
          <span className="text-sm font-medium text-muted-foreground border-l border-border pl-4 ml-2">Preview Mode</span>
        </div>
      </div>

      <div className="form-preview-container mt-8">
        <div className="h-3 w-full" style={{ backgroundColor: themeColor }}></div>
        
        <div className="p-8 md:p-10 space-y-8">
          <div className="space-y-3 border-b border-border pb-8">
            <h1 className="text-3xl font-bold font-display">{form.name || 'Untitled Form'}</h1>
            {form.description && <p className="text-muted-foreground whitespace-pre-wrap">{form.description}</p>}
            <p className="text-sm text-destructive mt-4">* Indicates required question</p>
          </div>

          <div className="space-y-8">
            {questions.map((q, index) => (
              <div key={q.id} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-base font-medium flex items-start gap-1">
                    {form.show_question_numbers && <span className="mr-1">{index + 1}.</span>}
                    {q.question_text || 'Untitled Question'}
                    {q.required && <span className="text-destructive">*</span>}
                  </Label>
                  {q.help_text && <p className="text-sm text-muted-foreground">{q.help_text}</p>}
                </div>
                <div className="pl-1">
                  {renderQuestionInput(q)}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-border flex justify-between items-center">
            <Button style={{ backgroundColor: themeColor, color: '#fff' }} className="px-8">Submit</Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">Clear form</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
