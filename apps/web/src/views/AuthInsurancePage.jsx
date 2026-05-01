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
import { ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { assertPortalSignIn } from '@/lib/portalAuth.js';
import EmailVerificationStep from '@/components/auth/EmailVerificationStep.jsx';

export default function AuthInsurancePage() {
  const navigate = useNavigate();
  const { login, signup, verifySignupEmail, logout, isAuthPending, error } = useAuth();
  const [activeTab, setActiveTab] = useState('signin');
  const [localError, setLocalError] = useState('');
  const [signupStep, setSignupStep] = useState('form');
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');

  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    licenseNumber: '',
    state: '',
    contactName: '',
    contactPhone: '',
    termsAccepted: false
  });

  const displayError = localError || error;

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      const user = await login(signInData.email, signInData.password);
      await assertPortalSignIn(user, 'insurance', logout);
      navigate('/insurance/dashboard');
    } catch (err) {
      setLocalError(err?.message || '');
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
      const nameParts = signUpData.contactName.split(' ');
      const firstName = nameParts[0] || 'Admin';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      const result = await signup(
        signUpData.email, 
        signUpData.password, 
        {
          name: signUpData.companyName,
          first_name: firstName,
          last_name: lastName,
          phone: signUpData.contactPhone,
          terms_accepted: true,
          privacy_preferences: true
        }, 
        'insurance'
      );
      if (result.outcome === 'verify_email') {
        setPendingVerifyEmail(result.email);
        setSignupStep('verify');
        return;
      }
      navigate('/insurance/dashboard');
    } catch (err) {
      setLocalError(err?.message || '');
    }
  };

  const handleVerifySignup = async (token) => {
    setLocalError('');
    try {
      await verifySignupEmail(pendingVerifyEmail, token);
      navigate('/insurance/dashboard');
    } catch (err) {
      setLocalError(err?.message || 'Verification failed.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Helmet><title>Insurance Portal - PayPill</title></Helmet>

      <div className="w-full max-w-md space-y-6">
        <Button variant="ghost" className="mb-4 -ml-4 text-muted-foreground" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to roles
        </Button>

        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-emerald-500/10 p-3 rounded-2xl mb-2">
            <ShieldCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Insurance Portal</h1>
          <p className="text-muted-foreground">Manage claims and population health</p>
        </div>

        <Card className="border-border/60 shadow-lg rounded-2xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setLocalError(''); setSignupStep('form'); }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-transparent p-0 h-14">
              <TabsTrigger value="signin" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none h-full">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none h-full">
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
                    <Label htmlFor="signin-email">Work Email</Label>
                    <Input 
                      id="signin-email" type="email" required className="rounded-xl"
                      value={signInData.email} onChange={e => setSignInData({...signInData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <Button variant="link" className="p-0 h-auto text-xs text-emerald-600 font-medium" type="button">
                        Forgot password?
                      </Button>
                    </div>
                    <Input 
                      id="signin-password" type="password" required className="rounded-xl"
                      value={signInData.password} onChange={e => setSignInData({...signInData, password: e.target.value})}
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-xl h-11 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isAuthPending}>
                    {isAuthPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
                    isLoading={isAuthPending}
                    accentClassName="bg-emerald-600 hover:bg-emerald-700"
                  />
                ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input 
                      id="companyName" required className="rounded-xl"
                      value={signUpData.companyName} onChange={e => setSignUpData({...signUpData, companyName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Work Email</Label>
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
                      <Label htmlFor="licenseNumber">License Number</Label>
                      <Input 
                        id="licenseNumber" required className="rounded-xl"
                        value={signUpData.licenseNumber} onChange={e => setSignUpData({...signUpData, licenseNumber: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Region</Label>
                      <Input 
                        id="state" required className="rounded-xl"
                        value={signUpData.state} onChange={e => setSignUpData({...signUpData, state: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input 
                        id="contactName" required className="rounded-xl"
                        value={signUpData.contactName} onChange={e => setSignUpData({...signUpData, contactName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input 
                        id="contactPhone" type="tel" required className="rounded-xl"
                        value={signUpData.contactPhone} onChange={e => setSignUpData({...signUpData, contactPhone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                      id="terms-ins" 
                      checked={signUpData.termsAccepted} 
                      onCheckedChange={(checked) => setSignUpData({...signUpData, termsAccepted: checked})}
                    />
                    <Label htmlFor="terms-ins" className="text-sm font-normal text-muted-foreground">
                      I accept the Terms & Conditions
                    </Label>
                  </div>
                  <Button type="submit" className="w-full rounded-xl h-11 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isAuthPending}>
                    {isAuthPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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