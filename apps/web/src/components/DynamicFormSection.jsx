import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

export default function DynamicFormSection({ fields, entries, onAdd, onRemove, onUpdate, title, addButtonText }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      {entries.map((entry, index) => (
        <div key={index} className="p-4 border rounded-xl bg-card relative space-y-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {fields.map((field) => (
              <div key={field.name} className={`space-y-2 ${field.fullWidth ? 'md:col-span-2' : ''}`}>
                <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                
                {field.type === 'select' ? (
                  <Select
                    value={entry[field.name] || ''}
                    onValueChange={(val) => onUpdate(index, field.name, val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'textarea' ? (
                  <Textarea
                    value={entry[field.name] || ''}
                    onChange={(e) => onUpdate(index, field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <Input
                    type={field.type || 'text'}
                    value={entry[field.name] || ''}
                    onChange={(e) => onUpdate(index, field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={onAdd} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-2" /> {addButtonText}
      </Button>
    </div>
  );
}