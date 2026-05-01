import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPortalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, isAuthenticated, userRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (!userRole) {
        navigate('/role-selection');
      } else if (userRole === 'patient') {
        navigate('/dashboard');
      } else if (userRole === 'provider') {
        navigate('/provider/dashboard');
      } else if (userRole === 'employer') {
        navigate('/employer/dashboard');
      } else if (userRole === 'insurance_company') {
        navigate('/insurance/dashboard');
      }
    }
  }, [isAuthenticated, userRole, navigate]);

  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: ''
  });

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!signInData.email || !signInData.password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(signInData.email, signInData.password);
      toast.success('Welcome back!');
      
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from);
      } else if (!user.role) {
        navigate('/role-selection');
      } else {
        navigate(user.role === 'patient' ? '/dashboard' : `/${user.role}/dashboard`);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (signUpData.password !== signUpData.passwordConfirm) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await signup({
        email: signUpData.email,
        password: signUpData.password,
        passwordConfirm: signUpData.passwordConfirm,
        first_name: signUpData.first_name,
        last_name: signUpData.last_name,
        phone: signUpData.phone,
        date_of_birth: signUpData.date_of_birth,
        terms_accepted: true,
        privacy_preferences: true
      });
      
      toast.success('Account created successfully!');
      navigate('/role-selection');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account. Please check your information.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Helmet>
        <title>Welcome to PayPill Healthcare</title>
      </Helmet>

      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-primary/10 p-3 rounded-2xl mb-2">
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">PayPill</h1>
          <p className="text-muted-foreground">Your comprehensive healthcare platform</p>
        </div>

        <Card className="border-border/60 shadow-lg rounded-2xl overflow-hidden">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-transparent p-0 h-14">
              <TabsTrigger 
                value="signin" 
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-full"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-full"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <CardContent className="p-6 pt-8">
              <TabsContent value="signin" className="mt-0 space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email address</Label>
                    <Input 
                      id="signin-email" 
                      type="email" 
                      placeholder="name@example.com" 
                      value={signInData.email}
                      onChange={(e) => setSignInData({...signInData, email: e.target.value})}
                      required 
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <Button variant="link" className="p-0 h-auto text-xs text-primary font-medium" type="button">
                        Forgot password?
                      </Button>
                    </div>
                    <Input 
                      id="signin-password" 
                      type="password" 
                      value={signInData.password}
                      onChange={(e) => setSignInData({...signInData, password: e.target.value})}
                      required 
                      className="rounded-xl"
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-xl h-11 mt-2" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First name</Label>
                      <Input 
                        id="first_name" 
                        value={signUpData.first_name}
                        onChange={(e) => setSignUpData({...signUpData, first_name: e.target.value})}
                        required 
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last name</Label>
                      <Input 
                        id="last_name" 
                        value={signUpData.last_name}
                        onChange={(e) => setSignUpData({...signUpData, last_name: e.target.value})}
                        required 
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email address</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="name@example.com" 
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({...signUpData, email: e.target.value})}
                      required 
                      className="rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone number</Label>
                      <Input 
                        id="phone" 
                        type="tel" 
                        value={signUpData.phone}
                        onChange={(e) => setSignUpData({...signUpData, phone: e.target.value})}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of birth</Label>
                      <Input 
                        id="dob" 
                        type="date" 
                        value={signUpData.date_of_birth}
                        onChange={(e) => setSignUpData({...signUpData, date_of_birth: e.target.value})}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password" 
                      type="password" 
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({...signUpData, password: e.target.value})}
                      required 
                      minLength={8}
                      className="rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password-confirm">Confirm password</Label>
                    <Input 
                      id="signup-password-confirm" 
                      type="password" 
                      value={signUpData.passwordConfirm}
                      onChange={(e) => setSignUpData({...signUpData, passwordConfirm: e.target.value})}
                      required 
                      minLength={8}
                      className="rounded-xl"
                    />
                  </div>

                  <Button type="submit" className="w-full rounded-xl h-11 mt-2" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}