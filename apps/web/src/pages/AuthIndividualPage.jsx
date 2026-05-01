import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Activity, Loader2, ArrowLeft } from 'lucide-react';
import { assertPortalSignIn } from '@/lib/portalAuth.js';
import EmailVerificationStep from '@/components/auth/EmailVerificationStep.jsx';

export default function AuthIndividualPage() {
  const navigate = useNavigate();
  const { login, signup, verifySignupEmail, logout, isLoading, error } = useAuth();
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
    termsAccepted: false
  });

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      const user = await login(signInData.email, signInData.password);
      await assertPortalSignIn(user, 'individual', logout);
      navigate('/patient/dashboard');
    } catch (err) {
      setLocalError(err?.message || '');
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (signUpData.password !== signUpData.confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }
    if (!signUpData.termsAccepted) {
      setLocalError("Please accept the terms and conditions");
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
          privacy_preferences: true
        }, 
        'individual'
      );
      if (result.outcome === 'verify_email') {
        setPendingVerifyEmail(result.email);
        setSignupStep('verify');
        return;
      }
      navigate('/patient/dashboard');
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleVerifySignup = async (token) => {
    setLocalError('');
    try {
      await verifySignupEmail(pendingVerifyEmail, token);
      navigate('/patient/dashboard');
    } catch (err) {
      setLocalError(err?.message || 'Verification failed.');
    }
  };

  const displayError = localError || error;
  const isSubmitting = isLoading;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Helmet><title>Patient Portal - PayPill</title></Helmet>

      <div className="w-full max-w-md space-y-6">
        <Button variant="ghost" className="mb-4 -ml-4 text-muted-foreground" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to roles
        </Button>

        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-orange-500/10 p-3 rounded-2xl mb-2">
            <Activity className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Portal</h1>
          <p className="text-muted-foreground">Manage your personal health journey</p>
        </div>

        <Card className="border-border/60 shadow-lg rounded-2xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setLocalError(''); setSignupStep('form'); }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-transparent p-0 h-14">
              <TabsTrigger value="signin" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:shadow-none h-full">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:shadow-none h-full">
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
                    <Label htmlFor="signin-email">Email address</Label>
                    <Input 
                      id="signin-email" type="email" required className="rounded-xl"
                      value={signInData.email} onChange={e => setSignInData({...signInData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <Button variant="link" className="p-0 h-auto text-xs text-orange-600 font-medium" type="button">
                        Forgot password?
                      </Button>
                    </div>
                    <Input 
                      id="signin-password" type="password" required className="rounded-xl"
                      value={signInData.password} onChange={e => setSignInData({...signInData, password: e.target.value})}
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-xl h-11 mt-2 bg-orange-600 hover:bg-orange-700 text-white" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                  <div className="text-center mt-4">
                    <Button variant="link" className="text-sm text-muted-foreground" type="button" onClick={() => setActiveTab('signup')}>
                      Don't have an account? Sign Up
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 space-y-4">
                {signupStep === 'verify' ? (
                  <EmailVerificationStep
                    email={pendingVerifyEmail}
                    onVerify={handleVerifySignup}
                    onBack={() => { setSignupStep('form'); setLocalError(''); }}
                    isLoading={isSubmitting}
                    accentClassName="bg-orange-600 hover:bg-orange-700"
                  />
                ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" required className="rounded-xl"
                      value={signUpData.fullName} onChange={e => setSignUpData({...signUpData, fullName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email address</Label>
                    <Input 
                      id="signup-email" type="email" required className="rounded-xl"
                      value={signUpData.email} onChange={e => setSignUpData({...signUpData, email: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input 
                        id="signup-password" type="password" required minLength={8} className="rounded-xl"
                        value={signUpData.password} onChange={e => setSignUpData({...signUpData, password: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input 
                        id="confirmPassword" type="password" required minLength={8} className="rounded-xl"
                        value={signUpData.confirmPassword} onChange={e => setSignUpData({...signUpData, confirmPassword: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" type="tel" className="rounded-xl"
                        value={signUpData.phone} onChange={e => setSignUpData({...signUpData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input 
                        id="dob" type="date" required className="rounded-xl"
                        value={signUpData.dateOfBirth} onChange={e => setSignUpData({...signUpData, dateOfBirth: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                      id="terms" 
                      checked={signUpData.termsAccepted} 
                      onCheckedChange={(checked) => setSignUpData({...signUpData, termsAccepted: checked})}
                    />
                    <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                      I accept the Terms & Conditions
                    </Label>
                  </div>
                  <Button type="submit" className="w-full rounded-xl h-11 mt-2 bg-orange-600 hover:bg-orange-700 text-white" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                  <div className="text-center mt-4">
                    <Button variant="link" className="text-sm text-muted-foreground" type="button" onClick={() => setActiveTab('signin')}>
                      Already have an account? Sign In
                    </Button>
                  </div>
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
