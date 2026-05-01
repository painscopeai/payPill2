import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, Database, Bell } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';

const SettingsPage = () => {
  const { currentUser, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accountData, setAccountData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    preferred_language: 'English',
    communication_preference: 'email'
  });

  const [securityData, setSecurityData] = useState({
    two_factor_enabled: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (currentUser) {
      setAccountData({
        first_name: currentUser.first_name || '',
        last_name: currentUser.last_name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        preferred_language: currentUser.preferred_language || 'English',
        communication_preference: currentUser.communication_preference || 'email'
      });
      setSecurityData({
        ...securityData,
        two_factor_enabled: currentUser.two_factor_enabled || false
      });
    }
  }, [currentUser]);

  const handleAccountUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatedUser = await pb.collection('users').update(currentUser.id, accountData, { $autoCancel: false });
      updateUser(updatedUser);
      toast.success('Account settings updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update account settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (securityData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await pb.collection('users').update(currentUser.id, {
        oldPassword: securityData.currentPassword,
        password: securityData.newPassword,
        passwordConfirm: securityData.confirmPassword
      }, { $autoCancel: false });

      setSecurityData({
        ...securityData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAToggle = async (enabled) => {
    setLoading(true);

    try {
      await pb.collection('users').update(currentUser.id, {
        two_factor_enabled: enabled
      }, { $autoCancel: false });

      setSecurityData({ ...securityData, two_factor_enabled: enabled });
      updateUser({ ...currentUser, two_factor_enabled: enabled });
      toast.success(enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled');
    } catch (error) {
      toast.error('Failed to update two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    toast.success('Health data export initiated. You will receive an email shortly.');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion is not yet implemented');
    }
  };

  return (
    <>
      <Helmet>
        <title>Settings - PayPill</title>
        <meta name="description" content="Manage your PayPill account settings, privacy preferences, and health data" />
      </Helmet>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-balance">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>

          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="account">
                <User className="h-4 w-4 mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="data">
                <Database className="h-4 w-4 mr-2" />
                Data
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Account settings</CardTitle>
                  <CardDescription>Update your account information</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAccountUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First name</Label>
                        <Input
                          id="first_name"
                          value={accountData.first_name}
                          onChange={(e) => setAccountData({ ...accountData, first_name: e.target.value })}
                          className="text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last name</Label>
                        <Input
                          id="last_name"
                          value={accountData.last_name}
                          onChange={(e) => setAccountData({ ...accountData, last_name: e.target.value })}
                          className="text-foreground"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={accountData.email}
                        onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                        className="text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={accountData.phone}
                        onChange={(e) => setAccountData({ ...accountData, phone: e.target.value })}
                        className="text-foreground"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="language">Preferred language</Label>
                        <Select
                          value={accountData.preferred_language}
                          onValueChange={(value) => setAccountData({ ...accountData, preferred_language: value })}
                        >
                          <SelectTrigger className="text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Spanish">Spanish</SelectItem>
                            <SelectItem value="French">French</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="communication">Communication preference</Label>
                        <Select
                          value={accountData.communication_preference}
                          onValueChange={(value) => setAccountData({ ...accountData, communication_preference: value })}
                        >
                          <SelectTrigger className="text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <div className="space-y-6">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>Two-factor authentication</CardTitle>
                    <CardDescription>Add an extra layer of security to your account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Two-factor authentication</p>
                        <p className="text-sm text-muted-foreground">
                          {securityData.two_factor_enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                      <Switch
                        checked={securityData.two_factor_enabled}
                        onCheckedChange={handle2FAToggle}
                        disabled={loading}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>Change password</CardTitle>
                    <CardDescription>Update your password regularly to keep your account secure</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={securityData.currentPassword}
                          onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                          className="text-foreground"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={securityData.newPassword}
                          onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                          className="text-foreground"
                          minLength={8}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm new password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={securityData.confirmPassword}
                          onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                          className="text-foreground"
                          minLength={8}
                        />
                      </div>

                      <Button type="submit" disabled={loading}>
                        {loading ? 'Changing...' : 'Change Password'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="data">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Health data management</CardTitle>
                  <CardDescription>Export or delete your health data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Export health records</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Download a copy of all your health data in a portable format
                    </p>
                    <Button onClick={handleExportData} variant="outline">
                      Export Data
                    </Button>
                  </div>

                  <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    <h3 className="font-medium mb-2 text-destructive">Delete account</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete your account and all associated health data
                    </p>
                    <Button onClick={handleDeleteAccount} variant="destructive">
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Notification preferences</CardTitle>
                  <CardDescription>Manage how you receive updates and alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Medication reminders</p>
                      <p className="text-sm text-muted-foreground">Get notified when it's time to take your medications</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Health insights</p>
                      <p className="text-sm text-muted-foreground">Receive personalized health recommendations</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Appointment reminders</p>
                      <p className="text-sm text-muted-foreground">Get reminded about upcoming healthcare appointments</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">Marketing emails</p>
                      <p className="text-sm text-muted-foreground">Receive updates about new features and health tips</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;