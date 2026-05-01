import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Star, Clock, Phone, Globe, Calendar } from 'lucide-react';

export default function MarketplaceSearchPage() {
  const navigate = useNavigate();
  const [view, setView] = useState('list');

  const providers = [
    { id: 1, name: 'Dr. Sarah Jenkins', type: 'Specialist', specialty: 'Cardiology', distance: '1.2 miles', rating: 4.8, reviews: 124, nextAvailable: 'Tomorrow', price: '$$' },
    { id: 2, name: 'City General Hospital', type: 'Hospital', specialty: 'General Practice', distance: '3.5 miles', rating: 4.5, reviews: 892, nextAvailable: 'Today', price: '$$$' },
    { id: 3, name: 'Acme Pharmacy', type: 'Pharmacy', specialty: 'Retail Pharmacy', distance: '0.8 miles', rating: 4.2, reviews: 56, nextAvailable: 'Open Now', price: '$' }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Find Care - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Find Care & Providers</h1>
          <p className="text-muted-foreground mt-1">Search for doctors, hospitals, and pharmacies in your network.</p>
        </div>

        {/* Search Bar */}
        <Card className="shadow-md border-border/50 mb-6">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Condition, procedure, doctor name..." className="pl-10 h-12 text-base" />
            </div>
            <div className="relative flex-1 md:max-w-xs">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Zip code or city" defaultValue="10001" className="pl-10 h-12 text-base" />
            </div>
            <Button className="h-12 px-8 text-base">Search</Button>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Select defaultValue="all">
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Provider Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="doctor">Doctors</SelectItem>
              <SelectItem value="hospital">Hospitals</SelectItem>
              <SelectItem value="pharmacy">Pharmacies</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="any">
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Availability" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="ml-auto" onClick={() => setView(view === 'list' ? 'map' : 'list')}>
            {view === 'list' ? 'Show Map' : 'Show List'}
          </Button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Results List */}
          <div className={`space-y-4 ${view === 'map' ? 'lg:col-span-1' : 'lg:col-span-3 grid lg:grid-cols-2 xl:grid-cols-3 lg:space-y-0'}`}>
            {providers.map(p => (
              <Card key={p.id} className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Badge variant="secondary" className="mb-2">{p.type}</Badge>
                      <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                      <p className="text-sm text-muted-foreground">{p.specialty}</p>
                    </div>
                    <div className="flex items-center bg-orange-50 px-2 py-1 rounded text-orange-700 text-sm font-medium">
                      <Star className="h-3.5 w-3.5 fill-current mr-1" /> {p.rating}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center"><MapPin className="h-4 w-4 mr-2" /> {p.distance} away</div>
                    <div className="flex items-center"><Clock className="h-4 w-4 mr-2" /> Next available: <span className="text-emerald-600 font-medium ml-1">{p.nextAvailable}</span></div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => navigate('/patient/booking')}>Book Now</Button>
                    <Button variant="outline" className="flex-1">View Profile</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Map View (Placeholder) */}
          {view === 'map' && (
            <div className="lg:col-span-2 bg-muted/30 rounded-xl border border-border/50 flex items-center justify-center min-h-[500px]">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Interactive Map View</p>
                <p className="text-sm">Requires Google Maps API Key</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}