import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LayoutDashboard, Loader2, ArrowLeft } from 'lucide-react';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';
import EmailVerificationStep from '@/components/auth/EmailVerificationStep.jsx';

export default function AuthAdminPage() {
  const navigate = useNavigate();
  const { login, signup, verifySignupEmail, isAuthPending, error, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('signin');
  const [localError, setLocalError] = useState('');
  const [signupStep, setSignupStep] = useState('form');
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');

  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '',
    termsAccepted: false,
  });

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

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (signUpData.password !== signUpData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (!signUpData.termsAccepted) {
      setLocalError('Please accept the terms and conditions');
      return;
    }

    try {
      const nameParts = signUpData.fullName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'User';

      const result = await signup(
        signUpData.email,
        signUpData.password,
        {
          name: signUpData.fullName,
          first_name: firstName,
          last_name: lastName,
          phone: signUpData.phone,
          date_of_birth: signUpData.dateOfBirth,
          terms_accepted: true,
          privacy_preferences: true,
        },
        'admin',
      );
      if (result.outcome === 'verify_email') {
        setPendingVerifyEmail(result.email);
        setSignupStep('verify');
        return;
      }
      await assertAdminUser(result.user);
      navigate('/admin/dashboard');
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleVerifySignup = async (token) => {
    setLocalError('');
    try {
      const user = await verifySignupEmail(pendingVerifyEmail, token);
      await assertAdminUser(user);
      navigate('/admin/dashboard');
    } catch (err) {
      setLocalError(err?.message || 'Verification failed.');
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
        <Button variant="ghost" className="mb-4 -ml-4 text-muted-foreground" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to roles
        </Button>

        <div className="flex flex-col items-center text-center space-y-2">
          <PayPillLogo tone="dark" className="h-12 max-h-14 w-auto mb-1" />
          <div className="bg-violet-500/10 p-3 rounded-2xl mb-2">
            <LayoutDashboard className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Administrator</h1>
          <p className="text-muted-foreground">Sign in to manage the platform</p>
        </div>

        <Card className="border-border/60 shadow-lg rounded-2xl overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val);
              setLocalError('');
              setSignupStep('form');
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-transparent p-0 h-14">
              <TabsTrigger
                value="signin"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-violet-600 data-[state=active]:shadow-none h-full"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-violet-600 data-[state=active]:shadow-none h-full"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <CardContent className="p-6 pt-8">
              {displayError && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                  {displayError}
                </div>
              )}

              <TabsContent value="signin" className="mt-0 space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-signin-email">Email address</Label>
                    <Input
                      id="admin-signin-email"
                      type="email"
                      required
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
              </TabsContent>

              <TabsContent value="signup" className="mt-0 space-y-4">
                {signupStep === 'verify' ? (
                  <EmailVerificationStep
                    email={pendingVerifyEmail}
                    onVerify={handleVerifySignup}
                    onBack={() => {
                      setSignupStep('form');
                      setLocalError('');
                    }}
                    isLoading={isSubmitting}
                    submitLabel="Verify and create account"
                    accentClassName="bg-violet-600 hover:bg-violet-700"
                  />
                ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-fullName">Full Name</Label>
                    <Input
                      id="admin-fullName"
                      required
                      className="rounded-xl"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-signup-email">Email address</Label>
                    <Input
                      id="admin-signup-email"
                      type="email"
                      required
                      className="rounded-xl"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-signup-password">Password</Label>
                      <Input
                        id="admin-signup-password"
                        type="password"
                        required
                        minLength={8}
                        className="rounded-xl"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-confirmPassword">Confirm Password</Label>
                      <Input
                        id="admin-confirmPassword"
                        type="password"
                        required
                        minLength={8}
                        className="rounded-xl"
                        value={signUpData.confirmPassword}
                        onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-phone">Phone Number</Label>
                      <Input
                        id="admin-phone"
                        type="tel"
                        className="rounded-xl"
                        value={signUpData.phone}
                        onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-dob">Date of Birth</Label>
                      <Input
                        id="admin-dob"
                        type="date"
                        required
                        className="rounded-xl"
                        value={signUpData.dateOfBirth}
                        onChange={(e) => setSignUpData({ ...signUpData, dateOfBirth: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="admin-terms"
                      checked={signUpData.termsAccepted}
                      onCheckedChange={(checked) => setSignUpData({ ...signUpData, termsAccepted: checked })}
                    />
                    <Label htmlFor="admin-terms" className="text-sm font-normal text-muted-foreground">
                      I accept the Terms & Conditions
                    </Label>
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-xl h-11 mt-2 bg-violet-600 hover:bg-violet-700 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Admin Account
                  </Button>
                </form>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
