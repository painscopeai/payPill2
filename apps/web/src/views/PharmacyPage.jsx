import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-8">
            <TabsTrigger value="prescriptions">My Prescriptions</TabsTrigger>
            <TabsTrigger value="locator">Find Pharmacy</TabsTrigger>
            <TabsTrigger value="delivery">Delivery Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="prescriptions">
            <PrescriptionRefill />
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