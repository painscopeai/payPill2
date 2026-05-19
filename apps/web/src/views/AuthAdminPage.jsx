import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Loader2 } from 'lucide-react';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';

export default function AuthAdminPage() {
  const navigate = useNavigate();
  const { login, isAuthPending, error, logout } = useAuth();
  const [localError, setLocalError] = useState('');
  const [signInData, setSignInData] = useState({ email: '', password: '' });

  const assertAdminUser = async (user) => {
    if (!user || user.role !== 'admin') {
      await logout();
      throw new Error('This portal is only for administrator accounts. Your profile role is not admin.');
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      const user = await login(signInData.email, signInData.password);
      await assertAdminUser(user);
      navigate('/admin/dashboard');
    } catch (err) {
      setLocalError(err?.message || 'Sign in failed.');
    }
  };

  const displayError = localError || error;
  const isSubmitting = isAuthPending;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Helmet>
        <title>Admin Portal - PayPill</title>
      </Helmet>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <PayPillLogo className="h-12 max-h-14 w-auto mb-1" />
          <div className="bg-violet-500/10 p-3 rounded-2xl mb-2">
            <LayoutDashboard className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Administrator</h1>
          <p className="text-muted-foreground">Sign in to manage the platform</p>
        </div>

        <Card className="border-border/60 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            {displayError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                {displayError}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-signin-email">Email address</Label>
                <Input
                  id="admin-signin-email"
                  type="email"
                  required
                  autoComplete="email"
                  className="rounded-xl"
                  value={signInData.email}
                  onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-signin-password">Password</Label>
                <Input
                  id="admin-signin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="rounded-xl"
                  value={signInData.password}
                  onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-xl h-11 mt-2 bg-violet-600 hover:bg-violet-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
