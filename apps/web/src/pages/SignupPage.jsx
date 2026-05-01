import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import EmailVerificationStep from '@/components/auth/EmailVerificationStep.jsx';

const SignupPage = () => {
  const { signup, verifySignupEmail, isAuthPending } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    terms_accepted: false,
    privacy_preferences: false
  });
  const [loading, setLoading] = useState(false);
  const [signupStep, setSignupStep] = useState('form');
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');

  const checkEmailExists = async (email) => {
    try {
      const records = await pb.collection('users').getFullList({
        filter: `email='${email}'`,
        $autoCancel: false
      });
      return records.length > 0;
    } catch (err) {
      console.error("Error checking email existence:", err);
      // If we can't check (e.g., due to permissions), we return false and let the signup method catch the 400 error
      return false; 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.passwordConfirm) {
      toast.error('Passwords do not match');
      return;
    }

    if (!formData.terms_accepted || !formData.privacy_preferences) {
      toast.error('Please accept the terms and privacy policy');
      return;
    }

    setLoading(true);

    try {
      // Pre-validation check for email existence
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        toast.error('Email already registered');
        setLoading(false);
        return;
      }

      const result = await signup(
        formData.email, 
        formData.password, 
        {
          name: `${formData.first_name} ${formData.last_name}`.trim(),
          first_name: formData.first_name,
          last_name: formData.last_name,
          terms_accepted: formData.terms_accepted,
          privacy_preferences: formData.privacy_preferences
        }, 
        'individual'
      );
      if (result.outcome === 'verify_email') {
        setPendingVerifyEmail(result.email);
        setSignupStep('verify');
        return;
      }
      toast.success('Account created successfully');
      navigate('/patient/onboarding');
    } catch (error) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignup = async (token) => {
    try {
      await verifySignupEmail(pendingVerifyEmail, token);
      toast.success('Account created successfully');
      navigate('/patient/onboarding');
    } catch (error) {
      toast.error(error.message || 'Verification failed');
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign Up - PayPill</title>
        <meta name="description" content="Create your PayPill account to access personalized health insights and AI-powered healthcare recommendations" />
      </Helmet>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 px-4 py-12">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>Get started with PayPill today</CardDescription>
          </CardHeader>
          <CardContent>
            {signupStep === 'verify' ? (
              <EmailVerificationStep
                email={pendingVerifyEmail}
                onVerify={handleVerifySignup}
                onBack={() => setSignupStep('form')}
                isLoading={isAuthPending}
                accentClassName="bg-primary hover:bg-primary/90"
              />
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First name</Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="John"
                    className="text-foreground"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="Doe"
                    className="text-foreground"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10 text-foreground"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    className="pl-10 text-foreground"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="passwordConfirm"
                    type="password"
                    placeholder="Confirm your password"
                    className="pl-10 text-foreground"
                    value={formData.passwordConfirm}
                    onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={formData.terms_accepted}
                    onCheckedChange={(checked) => setFormData({ ...formData, terms_accepted: checked })}
                  />
                  <Label htmlFor="terms" className="text-sm leading-none cursor-pointer">
                    I accept the terms of service
                  </Label>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="privacy"
                    checked={formData.privacy_preferences}
                    onCheckedChange={(checked) => setFormData({ ...formData, privacy_preferences: checked })}
                  />
                  <Label htmlFor="privacy" className="text-sm leading-none cursor-pointer">
                    I accept the privacy policy
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SignupPage;