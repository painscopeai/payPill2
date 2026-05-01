import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Building, User } from 'lucide-react';

export default function ProviderCard({ provider, onSelect, isSelected }) {
  return (
    <Card 
      className={`cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
      onClick={() => onSelect && onSelect(provider)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              {provider.provider_name || 'Dr. Provider'}
            </h4>
            <p className="text-sm text-muted-foreground capitalize">{provider.specialty || 'General Practice'}</p>
          </div>
          <div className="flex items-center text-sm font-medium text-amber-500">
            <Star className="h-3.5 w-3.5 fill-current mr-1" /> {provider.ratings || '4.8'}
          </div>
        </div>
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5" /> 
            {provider.hospital_affiliation || 'Independent Practice'}
          </div>
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> 
            Accepting New Patients
          </div>
        </div>
      </CardContent>
    </Card>
  );
}