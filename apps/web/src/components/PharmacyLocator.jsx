import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, Navigation, Phone, Clock, Heart, Building2 } from 'lucide-react';
import { usePharmacies } from '@/hooks/usePharmacies.js';

export default function PharmacyLocator() {
  const { pharmacies, loading } = usePharmacies();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredPharmacies = pharmacies.filter(p => {
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    const matchesSearch = !searchQuery || 
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
      (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search by name, address, or city..." 
                className="pl-10 h-11 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px] h-11">
                <SelectValue placeholder="Pharmacy Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="chain">Chain Pharmacy</SelectItem>
                <SelectItem value="independent">Independent</SelectItem>
                <SelectItem value="mail-order">Mail Order</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List View */}
        <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : filteredPharmacies.length > 0 ? (
            filteredPharmacies.map((pharmacy) => (
              <Card key={pharmacy.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg leading-tight">{pharmacy.name}</h3>
                    <Badge variant="secondary" className="capitalize text-[10px]">{pharmacy.type || 'standard'}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground mt-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{pharmacy.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{pharmacy.phone || 'Phone unavailable'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="text-success font-medium">Hours</span>
                      <span className="text-xs">• {pharmacy.hours || 'Contact for hours'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5">
                      <Navigation className="h-3.5 w-3.5" /> Directions
                    </Button>
                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center p-8 text-muted-foreground border rounded-xl border-dashed">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No pharmacies found matching your search.</p>
            </div>
          )}
        </div>

        {/* Map View Placeholder */}
        <div className="lg:col-span-2 bg-muted rounded-xl border border-border flex items-center justify-center min-h-[400px] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          <div className="text-center z-10 bg-background/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border">
            <MapPin className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-lg">Interactive Map</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">Select a pharmacy from the list to view its location and get directions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}