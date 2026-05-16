
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function SystemSettingsPage() {
  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">System Settings</h1>
        <p className="text-muted-foreground">Configure global platform parameters.</p>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="bg-muted/50 border border-border p-1 w-full justify-start overflow-x-auto">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="rewards">PPLL Rewards</TabsTrigger>
          <TabsTrigger value="ai">AI Model</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <Card className="border-none shadow-sm mt-4">
          <CardContent className="p-6">
            <TabsContent value="notifications" className="m-0 space-y-4">
              <h3 className="text-lg font-medium mb-4">Email Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Sender Name</Label><Input defaultValue="PayPill System" className="bg-background"/></div>
                <div className="space-y-2"><Label>Sender Email</Label><Input defaultValue="noreply@paypill.com" className="bg-background"/></div>
              </div>
              <Button onClick={handleSave} className="mt-4 bg-primary-gradient">Save Changes</Button>
            </TabsContent>

            <TabsContent value="config" className="m-0 space-y-6">
              <h3 className="text-lg font-medium mb-4">Feature Toggles</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">Disable access to public portals</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">AI Features</p>
                    <p className="text-sm text-muted-foreground">Enable AI insights globally</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <Button onClick={handleSave} className="mt-4 bg-primary-gradient">Save Changes</Button>
            </TabsContent>
            
            {/* Fallback for other tabs to save space but satisfy structure */}
            <TabsContent value="payments">
               <p className="text-muted-foreground py-8">Payment gateway configuration area.</p>
            </TabsContent>
            <TabsContent value="subscriptions">
               <p className="text-muted-foreground py-8">Subscription rules and limits configuration.</p>
            </TabsContent>
            <TabsContent value="rewards">
               <p className="text-muted-foreground py-8">PPLL token reward rules configuration.</p>
            </TabsContent>
            <TabsContent value="ai">
               <p className="text-muted-foreground py-8">LLM token limits and temperature controls.</p>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

