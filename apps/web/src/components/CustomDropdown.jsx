import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function CustomDropdown({ options, value, onChange, placeholder = "Select an option" }) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  useEffect(() => {
    if (value && !options.includes(value) && value !== 'custom') {
      setIsCustom(true);
      setCustomValue(value);
    } else if (value === 'custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
    }
  }, [value, options]);

  const handleSelectChange = (val) => {
    if (val === 'custom') {
      setIsCustom(true);
      onChange('');
    } else {
      setIsCustom(false);
      onChange(val);
    }
  };

  const handleCustomChange = (e) => {
    setCustomValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      <Select value={isCustom ? 'custom' : value} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-full form-input-animated">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="dropdown-content-animated">
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
          <SelectItem value="custom" className="font-medium text-primary">Add custom...</SelectItem>
        </SelectContent>
      </Select>
      
      {isCustom && (
        <div className="custom-entry-reveal mt-2">
          <Input
            placeholder="Please specify..."
            value={customValue}
            onChange={handleCustomChange}
            className="form-input-animated"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}