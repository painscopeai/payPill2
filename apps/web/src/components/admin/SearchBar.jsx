
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export function SearchBar({ placeholder = "Search...", onSearch, className }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) onSearch(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input 
        placeholder={placeholder}
        className="pl-9 bg-background border-[hsl(var(--admin-border))]"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
