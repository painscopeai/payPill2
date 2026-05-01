import React, { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function MultiSelectDropdown({ options, selected = [], onChange, placeholder = "Select options" }) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const toggleOption = (option) => {
    const newSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const addCustomOption = (e) => {
    e.preventDefault();
    if (customInput.trim() && !selected.includes(customInput.trim())) {
      onChange([...selected, customInput.trim()]);
      setCustomInput('');
    }
  };

  const removeOption = (option, e) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== option));
  };

  // Combine predefined options with any custom ones currently selected
  const allOptions = Array.from(new Set([...options, ...selected]));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 py-2 form-input-animated font-normal"
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
            {selected.map((item) => (
              <Badge key={item} variant="secondary" className="mr-1 mb-1">
                {item}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") removeOption(item, e);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => removeOption(item, e)}
                >
                  <span className="sr-only">Remove {item}</span>
                  <Check className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 dropdown-content-animated" align="start">
        <div className="max-h-64 overflow-y-auto p-1">
          {allOptions.map((option) => (
            <div
              key={option}
              className={cn(
                "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                selected.includes(option) ? "bg-accent/50" : ""
              )}
              onClick={() => toggleOption(option)}
            >
              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {selected.includes(option) && <Check className="h-4 w-4" />}
              </span>
              {option}
            </div>
          ))}
        </div>
        <div className="p-2 border-t">
          <form onSubmit={addCustomOption} className="flex gap-2">
            <Input
              size="sm"
              placeholder="Add custom..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="h-8"
            />
            <Button type="submit" size="sm" variant="secondary" className="h-8 px-2">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}