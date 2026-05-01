
import React from 'react';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function FilterPanel({ children, onReset, activeFiltersCount = 0 }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 relative">
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Advanced Filters</h4>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onReset} className="h-auto p-1 px-2 text-xs">
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
          <div className="space-y-4">
            {children}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
