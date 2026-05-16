import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import apiServerClient from '@/lib/apiServerClient';
import { Stethoscope, Loader2, ArrowLeft } from 'lucide-react';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';
import { assertPortalSignIn } from '@/lib/portalAuth.js';
import { postSignupProfilePath } from '@/lib/postSignupProfilePath.js';
import EmailVerificationStep from '@/components/auth/EmailVerificationStep.jsx';

export default function AuthProviderPage() {
  const navigate = useNavigate();
  const { login, signup, verifySignupEmail, logout, isAuthPending, error } = useAuth();
  const [activeTab, setActiveTab] = useState('signin');
  const [localError, setLocalError] = useState('');
  const [signupStep, setSignupStep] = useState('form');
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');

  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [providerTypes, setProviderTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);

  const [signUpData, setSignUpData] = useState({
    practiceName: '',
    providerType: '',
    npi: '',
    email: '',
    password: '',
    confirmPassword: '',
    contactName: '',
    contactPhone: '',
    termsAccepted: false,
  });

  const displayError = localError || error;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTypesLoading(true);
      try {
        const res = await apiServerClient.fetch('/public/provider-types');
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setProviderTypes(json.items || []);
        }
      } catch {
        if (!cancelled) setProviderTypes([]);
      } finally {
        if (!cancelled) setTypesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      const user = await login(String(signInData.email || '').trim().toLowerCase(), signInData.password);
      await assertPortalSignIn(user, 'provider', logout);
      if (user?.provider_onboarding_completed !== true) {
        navigate('/provider/onboarding');
      } else {
        navigate('/provider/dashboard');
      }
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
    if (!signUpData.providerType) {
      setLocalError('Please select your practice specialty');
      return;
    }

    try {
      const nameParts = signUpData.contactName.split(' ');
      const firstName = nameParts[0] || 'Provider';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      const result = await signup(
        signUpData.email,
        signUpData.password,
        {
          name: signUpData.practiceName,
          first_name: firstName,
          last_name: lastName,
          phone: signUpData.contactPhone,
          terms_accepted: true,
          privacy_preferences: true,
          provider_type: signUpData.providerType,
          npi: signUpData.npi || undefined,
        },
        'provider',
      );
      if (result.outcome === 'verify_email') {
        setPendingVerifyEmail(result.email);
        setSignupStep('verify');
        return;
      }
      navigate(postSignupProfilePath('provider'));
    } catch (err) {
      setLocalError(err?.message || '');
    }
  };

  const handleVerifySignup = async (token) => {
    setLocalError('');
    try {
      await verifySignupEmail(pendingVerifyEmail, token);
      navigate(postSignupProfilePath('provider'));
    } catch (err) {
      setLocalError(err?.message || 'Verification failed.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Helmet>
        <title>Provider Portal - PayPill</title>
      </Helmet>

      <div className="w-full max-w-md space-y-6">
        <Button variant="ghost" className="mb-4 -ml-4 text-muted-foreground" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to roles
        </Button>

        <div className="flex flex-col items-center text-center space-y-2">
          <PayPillLogo className="h-8 max-h-9 w-auto mb-1" />
          <div className="bg-teal-500/10 p-3 rounded-2xl mb-2">
            <Stethoscope className="h-8 w-8 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Provider Portal</h1>
          <p className="text-muted-foreground">Clinical tools, scheduling, and patient coordination</p>
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
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:shadow-none h-full"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:shadow-none h-full"
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
                    <Label htmlFor="prov-signin-email">Work Email</Label>
                    <Input
                      id="prov-signin-email"
                      type="email"
                      required
                      className="rounded-xl"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prov-signin-password">Password</Label>
                    <Input
                      id="prov-signin-password"
                      type="password"
                      required
                      className="rounded-xl"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-xl h-11 mt-2 bg-teal-600 hover:bg-teal-700 text-white"
                    disabled={isAuthPending}
                  >
                    {isAuthPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                  <div className="text-center mt-4">
                    <Button variant="link" className="text-sm text-muted-foreground" type="button" onClick={() => setActiveTab('signup')}>
                      Don&apos;t have an account? Sign Up
                    </Button>
                  </div>
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
                    isLoading={isAuthPending}
                    accentClassName="bg-teal-600 hover:bg-teal-700"
                  />
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="practiceName">Practice or clinic name</Label>
                      <Input
                        id="practiceName"
                        required
                        className="rounded-xl"
                        value={signUpData.practiceName}
                        onChange={(e) => setSignUpData({ ...signUpData, practiceName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="providerType">Practice specialty</Label>
                      <Select
                        value={signUpData.providerType || undefined}
                        onValueChange={(v) => setSignUpData({ ...signUpData, providerType: v })}
                        disabled={typesLoading}
                      >
                        <SelectTrigger id="providerType" className="rounded-xl bg-background">
                          <SelectValue placeholder={typesLoading ? 'Loading…' : 'Select specialty'} />
                        </SelectTrigger>
                        <SelectContent>
                          {providerTypes.map((t) => (
                            <SelectItem key={t.slug} value={t.slug}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="npi">NPI (optional)</Label>
                      <Input
                        id="npi"
                        className="rounded-xl"
                        inputMode="numeric"
                        value={signUpData.npi}
                        onChange={(e) => setSignUpData({ ...signUpData, npi: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prov-signup-email">Work Email</Label>
                      <Input
                        id="prov-signup-email"
                        type="email"
                        required
                        className="rounded-xl"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prov-signup-password">Password</Label>
                        <Input
                          id="prov-signup-password"
                          type="password"
                          required
                          minLength={8}
                          className="rounded-xl"
                          value={signUpData.password}
                          onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prov-confirm-password">Confirm</Label>
                        <Input
                          id="prov-confirm-password"
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
                        <Label htmlFor="prov-contact-name">Your name</Label>
                        <Input
                          id="prov-contact-name"
                          required
                          className="rounded-xl"
                          value={signUpData.contactName}
                          onChange={(e) => setSignUpData({ ...signUpData, contactName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prov-contact-phone">Phone</Label>
                        <Input
                          id="prov-contact-phone"
                          type="tel"
                          required
                          className="rounded-xl"
                          value={signUpData.contactPhone}
                          onChange={(e) => setSignUpData({ ...signUpData, contactPhone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="terms-prov"
                        checked={signUpData.termsAccepted}
                        onCheckedChange={(checked) => setSignUpData({ ...signUpData, termsAccepted: checked })}
                      />
                      <Label htmlFor="terms-prov" className="text-sm font-normal text-muted-foreground">
                        I accept the Terms & Conditions
                      </Label>
                    </div>
                    <Button
                      type="submit"
                      className="w-full rounded-xl h-11 mt-2 bg-teal-600 hover:bg-teal-700 text-white"
                      disabled={isAuthPending}
                    >
                      {isAuthPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create account
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
