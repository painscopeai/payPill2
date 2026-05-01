import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CreditCard, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployerSettingsPage() {
  const handleSave = (e) => {
    e.preventDefault();
    toast.success('Settings updated successfully');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet><title>Settings - PayPill</title></Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your company profile, billing, and integrations.</p>
        </div>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid grid-cols-4 bg-muted/50 p-1 rounded-xl w-full max-w-2xl mb-8">
            <TabsTrigger value="company" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><Building2 className="h-4 w-4 mr-2"/> Company</TabsTrigger>
            <TabsTrigger value="billing" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><CreditCard className="h-4 w-4 mr-2"/> Billing</TabsTrigger>
            <TabsTrigger value="integrations" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><LinkIcon className="h-4 w-4 mr-2"/> Integrations</TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"><ShieldCheck className="h-4 w-4 mr-2"/> Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="company">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>Update your organizational details.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input defaultValue="Acme Corporation" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input defaultValue="Technology" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Email</Label>
                      <Input defaultValue="hr@acmecorp.com" type="email" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input defaultValue="+1 (555) 123-4567" className="rounded-xl" />
                    </div>
                  </div>
                  <Button type="submit" className="rounded-xl">Save Changes</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Subscription & Billing</CardTitle>
                <CardDescription>Manage your current plan and payment methods.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">Enterprise Health Plan</h3>
                    <p className="text-sm text-muted-foreground">Billed annually • Renews Jan 1, 2027</p>
                  </div>
                  <Button variant="outline" className="rounded-xl">Change Plan</Button>
                </div>
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Payment Method</h4>
                  <div className="flex items-center gap-4 border rounded-xl p-4">
                    <div className="bg-muted p-2 rounded-md"><CreditCard className="h-6 w-6" /></div>
                    <div className="flex-1">
                      <p className="font-medium">Visa ending in 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/28</p>
                    </div>
                    <Button variant="ghost" className="text-primary">Update</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>HRIS & Payroll Integrations</CardTitle>
                <CardDescription>Connect your existing systems to sync employee data automatically.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { name: 'Workday', status: 'Connected', desc: 'Syncs employee roster nightly' },
                  { name: 'Gusto', status: 'Not connected', desc: 'Payroll deduction sync' },
                  { name: 'BambooHR', status: 'Not connected', desc: 'Roster and benefits sync' }
                ].map((int, i) => (
                  <div key={i} className="flex items-center justify-between border rounded-xl p-4">
                    <div>
                      <h4 className="font-semibold">{int.name}</h4>
                      <p className="text-sm text-muted-foreground">{int.desc}</p>
                    </div>
                    <Button variant={int.status === 'Connected' ? 'outline' : 'default'} className="rounded-xl">
                      {int.status === 'Connected' ? 'Manage' : 'Connect'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Security & Privacy</CardTitle>
                <CardDescription>Manage organization-wide security policies.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="space-y-0.5">
                    <Label className="text-base">Require Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Mandatory 2FA for all admin accounts.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="space-y-0.5">
                    <Label className="text-base">Anonymize Reporting Threshold</Label>
                    <p className="text-sm text-muted-foreground">Hide metrics if department size is under 10 to protect privacy.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}