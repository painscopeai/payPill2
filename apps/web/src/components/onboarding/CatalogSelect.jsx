import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Dropdown backed by /option-catalog (profile_option_sets).
 */
export default function CatalogSelect({
  setKey,
  options = [],
  loading = false,
  value,
  onValueChange,
  placeholder = 'Select…',
  disabled = false,
  className = '',
  id,
}) {
  if (loading) {
    return <Skeleton className={`h-10 w-full rounded-md ${className}`} />;
  }

  return (
    <Select value={value || ''} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className={`text-foreground ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {(options || []).map((opt) => (
          <SelectItem key={`${setKey}-${opt.slug}`} value={opt.slug}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
