
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown, Plus, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUESTION_TYPES = [
  { value: 'short_text', label: 'Short Text' },
  { value: 'long_text', label: 'Paragraph' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'linear_scale', label: 'Linear Scale' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'file_upload', label: 'File Upload' },
  { value: 'rating', label: 'Rating' }
];

export function QuestionBuilder({ 
  question, 
  isActive, 
  onClick, 
  onChange, 
  onDelete, 
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}) {
  const updateField = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  const updateOptions = (newOptions) => {
    onChange({ ...question, options_json: newOptions });
  };

  const addOption = () => {
    const opts = question.options_json || [];
    updateOptions([...opts, `Option ${opts.length + 1}`]);
  };

  const removeOption = (index) => {
    const opts = [...(question.options_json || [])];
    opts.splice(index, 1);
    updateOptions(opts);
  };

  const updateOptionText = (index, text) => {
    const opts = [...(question.options_json || [])];
    opts[index] = text;
    updateOptions(opts);
  };

  const renderOptionsEditor = () => {
    const type = question.question_type;
    if (!['multiple_choice', 'checkboxes', 'dropdown'].includes(type)) return null;

    const opts = question.options_json || [];
    const inputType = type === 'checkboxes' ? 'checkbox' : 'radio';

    return (
      <div className="space-y-2 mt-4">
        {opts.map((opt, idx) => (
          <div key={idx} className="option-item">
            <input type={inputType} disabled className="w-4 h-4 text-primary" />
            <Input 
              value={opt} 
              onChange={(e) => updateOptionText(idx, e.target.value)}
              className="flex-1 h-9 bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background transition-all"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => removeOption(idx)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <div className="option-item">
          <input type={inputType} disabled className="w-4 h-4 text-primary opacity-50" />
          <Button variant="ghost" size="sm" onClick={addOption} className="text-muted-foreground hover:text-foreground">
            <Plus className="w-4 h-4 mr-2" /> Add Option
          </Button>
        </div>
      </div>
    );
  };

  const renderScaleEditor = () => {
    if (question.question_type !== 'linear_scale') return null;
    const validation = question.validation_json || { min: 1, max: 5, minLabel: '', maxLabel: '' };
    
    return (
      <div className="space-y-4 mt-4 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center gap-4">
          <Select value={String(validation.min)} onValueChange={(v) => updateField('validation_json', {...validation, min: parseInt(v)})}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="0">0</SelectItem><SelectItem value="1">1</SelectItem></SelectContent>
          </Select>
          <span className="text-muted-foreground">to</span>
          <Select value={String(validation.max)} onValueChange={(v) => updateField('validation_json', {...validation, max: parseInt(v)})}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="w-6 text-center text-sm text-muted-foreground">{validation.min}</span>
            <Input placeholder="Label (optional)" value={validation.minLabel || ''} onChange={(e) => updateField('validation_json', {...validation, minLabel: e.target.value})} />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-6 text-center text-sm text-muted-foreground">{validation.max}</span>
            <Input placeholder="Label (optional)" value={validation.maxLabel || ''} onChange={(e) => updateField('validation_json', {...validation, maxLabel: e.target.value})} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("question-card group", isActive && "active")} onClick={onClick}>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity drag-handle">
        <GripVertical className="w-5 h-5 rotate-90" />
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start mt-4">
        <div className="flex-1 space-y-4 w-full">
          <Input 
            value={question.question_text} 
            onChange={(e) => updateField('question_text', e.target.value)}
            placeholder="Question Title"
            className="text-lg font-medium bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background px-2 h-12"
          />
          {question.help_text !== undefined && (
            <Input 
              value={question.help_text || ''} 
              onChange={(e) => updateField('help_text', e.target.value)}
              placeholder="Description (optional)"
              className="text-sm text-muted-foreground bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-background px-2 h-8"
            />
          )}
        </div>
        
        {isActive && (
          <div className="w-full md:w-64 shrink-0">
            <Select value={question.question_type} onValueChange={(v) => updateField('question_type', v)}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Preview Area based on type */}
      <div className="mt-6 pl-2">
        {question.question_type === 'short_text' && <Input disabled placeholder="Short answer text" className="w-1/2 border-dashed" />}
        {question.question_type === 'long_text' && <Textarea disabled placeholder="Long answer text" className="border-dashed" />}
        {question.question_type === 'date' && <Input type="date" disabled className="w-48 border-dashed" />}
        {question.question_type === 'time' && <Input type="time" disabled className="w-32 border-dashed" />}
        {question.question_type === 'file_upload' && (
          <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm">File upload area</span>
          </div>
        )}
        {renderOptionsEditor()}
        {renderScaleEditor()}
      </div>

      {/* Footer Actions */}
      {isActive && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst}>
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast}>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Duplicate">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete" className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-2"></div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`req-${question.id}`} className="text-sm font-medium cursor-pointer">Required</Label>
              <Switch 
                id={`req-${question.id}`} 
                checked={question.required} 
                onCheckedChange={(c) => updateField('required', c)} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
