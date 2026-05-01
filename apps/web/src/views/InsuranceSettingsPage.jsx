import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function InsuranceSettingsPage() {
  const handleSave = (e) => {
    e.preventDefault();
    toast.success('Settings saved successfully');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Insurance Settings - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage carrier profile and system integrations.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <Card className="border-border/60 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Carrier Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="carrierName">Carrier Name</Label>
                <Input id="carrierName" defaultValue="National Health Trust" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license">NAIC / License Number</Label>
                <Input id="license" defaultValue="1234567890" className="rounded-xl" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="rounded-xl px-8">Save Changes</Button>
          </div>
        </form>
      </main>
    </div>
  );
}