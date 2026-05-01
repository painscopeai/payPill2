import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Navigation, Phone, Clock, Building2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1rem'
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060
};

export default function PharmacyLocatorPage() {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);

  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        const data = await pb.collection('pharmacies').getList(1, 50, { $autoCancel: false });
        setPharmacies(data.items);
      } catch (error) {
        console.error('Error fetching pharmacies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacies();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => console.log('Geolocation permission denied')
      );
    }
  }, []);

  const filteredPharmacies = pharmacies.filter(p => 
    !searchQuery || 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Find a Pharmacy - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-display tracking-tight mb-4">Find a Pharmacy</h1>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search by name or address..." 
              className="pl-10 h-12 text-base rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
          <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 pb-4">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl"></div>)
            ) : filteredPharmacies.length > 0 ? (
              filteredPharmacies.map((pharmacy) => (
                <Card 
                  key={pharmacy.id} 
                  className={`interactive-card rounded-2xl border-border/50 ${selectedPharmacy?.id === pharmacy.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedPharmacy(pharmacy)}
                >
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg leading-tight">{pharmacy.name}</h3>
                      <Badge variant="secondary" className="capitalize">{pharmacy.type || 'Standard'}</Badge>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{pharmacy.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{pharmacy.phone || 'Phone unavailable'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center p-8 text-muted-foreground border rounded-2xl border-dashed">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No pharmacies found.</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-muted rounded-2xl border border-border overflow-hidden relative">
            {/* Fallback if Google Maps API key is not provided in env */}
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm z-10">
              <div className="text-center p-6 bg-background rounded-2xl shadow-lg max-w-sm">
                <MapPin className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Map View Unavailable</h3>
                <p className="text-sm text-muted-foreground">Google Maps integration requires a valid API key. The list view on the left remains fully functional.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}