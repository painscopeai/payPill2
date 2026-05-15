import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import PrescriptionRefill from '@/components/PrescriptionRefill.jsx';
import PharmacyLocator from '@/components/PharmacyLocator.jsx';
import DeliveryTracking from '@/components/DeliveryTracking.jsx';

export default function PharmacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Pharmacy - PayPill</title>
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Pharmacy Services</h1>

        <Tabs defaultValue="prescriptions" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-4 mb-8">
            <TabsTrigger value="prescriptions">My Prescriptions</TabsTrigger>
            <TabsTrigger value="shop">Shop</TabsTrigger>
            <TabsTrigger value="locator">Find Pharmacy</TabsTrigger>
            <TabsTrigger value="delivery">Delivery Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="prescriptions">
            <PrescriptionRefill />
          </TabsContent>

          <TabsContent value="shop">
            <p className="text-sm text-muted-foreground mb-4 max-w-xl">
              Order medications from PayPill pharmacy practices with live inventory.
            </p>
            <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white">
              <Link to="/patient/pharmacy/shop">Open pharmacy shop</Link>
            </Button>
          </TabsContent>

          <TabsContent value="locator">
            <PharmacyLocator />
          </TabsContent>

          <TabsContent value="delivery">
            <DeliveryTracking />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}