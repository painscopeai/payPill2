import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';

export default function FilterPanel({ onSearch, placeholder = "Search...", children }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-4 rounded-2xl border border-border/60 shadow-sm mb-6">
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder={placeholder}
          onChange={(e) => onSearch && onSearch(e.target.value)}
          className="pl-9 rounded-xl bg-background"
        />
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {children}
        <Button variant="outline" size="icon" className="rounded-xl shrink-0">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}