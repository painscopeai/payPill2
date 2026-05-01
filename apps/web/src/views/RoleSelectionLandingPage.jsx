import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building2, ShieldCheck, Activity, ArrowRight, LayoutDashboard } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

export default function RoleSelectionLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Welcome to PayPill Healthcare</title>
      </Helmet>

      {!isSupabaseConfigured && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-950 dark:text-amber-100 px-4 py-3 text-center text-sm">
          <strong>Backend env missing:</strong> add{' '}
          <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel
          (Project → Settings → Environment Variables), then redeploy. Until then, sign-in will not work.
        </div>
      )}

      <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              PayPill
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Healthcare management, <span className="text-primary">simplified.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Select your portal to access tailored tools for managing health, benefits, and coverage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Individual Card */}
          <Card className="flex flex-col h-full rounded-2xl border-border/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
                <User className="h-7 w-7 text-orange-600" />
              </div>
              <CardTitle className="text-2xl">Manage Your Health</CardTitle>
              <CardDescription className="text-base mt-2">For Individuals & Patients</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-muted-foreground">
                Manage your health, book appointments, track prescriptions, and view personalized AI insights.
              </p>
            </CardContent>
            <CardFooter className="pt-4 mt-auto">
              <Button 
                className="w-full rounded-xl gap-2 bg-orange-600 hover:bg-orange-700 text-white" 
                onClick={() => navigate('/auth/individual')}
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Employer Card */}
          <Card className="flex flex-col h-full rounded-2xl border-border/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                <Building2 className="h-7 w-7 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Manage Employee Benefits</CardTitle>
              <CardDescription className="text-base mt-2">For Employers & HR</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-muted-foreground">
                Manage employee health benefits, track wellness programs, and monitor organizational health metrics.
              </p>
            </CardContent>
            <CardFooter className="pt-4 mt-auto">
              <Button 
                className="w-full rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 text-white" 
                onClick={() => navigate('/auth/employer')}
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Insurance Card */}
          <Card className="flex flex-col h-full rounded-2xl border-border/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <ShieldCheck className="h-7 w-7 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl">Manage Claims & Coverage</CardTitle>
              <CardDescription className="text-base mt-2">For Insurance Providers</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-muted-foreground">
                Manage claims, verify coverage, route payments, and access population health analytics.
              </p>
            </CardContent>
            <CardFooter className="pt-4 mt-auto">
              <Button 
                className="w-full rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" 
                onClick={() => navigate('/auth/insurance')}
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Admin Card */}
          <Card className="flex flex-col h-full rounded-2xl border-border/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                <LayoutDashboard className="h-7 w-7 text-violet-600" />
              </div>
              <CardTitle className="text-2xl">Platform Administration</CardTitle>
              <CardDescription className="text-base mt-2">For Administrators</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-muted-foreground">
                Access analytics, manage users, subscriptions, providers, and system configuration.
              </p>
            </CardContent>
            <CardFooter className="pt-4 mt-auto">
              <Button
                className="w-full rounded-xl gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={() => navigate('/auth/admin')}
              >
                Admin Sign In <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>

      <footer className="border-t py-8 mt-auto bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">PayPill</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PayPill Healthcare Platform. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}