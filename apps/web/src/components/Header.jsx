import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Activity, LogOut, User, Menu, Sparkles } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function Header() {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const PatientNav = () => (
    <>
      <Link to="/patient/dashboard" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/patient/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}>Dashboard</Link>
      <Link to="/patient/records" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/patient/records') ? 'text-primary' : 'text-muted-foreground'}`}>Records</Link>
      <Link to="/patient/appointments" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/patient/appointments') ? 'text-primary' : 'text-muted-foreground'}`}>Appointments</Link>
      <Link to="/patient/prescriptions" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/patient/prescriptions') ? 'text-primary' : 'text-muted-foreground'}`}>Prescriptions</Link>
      <Link to="/patient/ai-recommendations" className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${isActive('/patient/ai-recommendations') ? 'text-primary' : 'text-muted-foreground'}`}>
        <Sparkles className="h-3 w-3" /> Insights
      </Link>
      <Link to="/patient/marketplace" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/patient/marketplace') ? 'text-primary' : 'text-muted-foreground'}`}>Find Care</Link>
    </>
  );

  const EmployerNav = () => (
    <>
      <Link to="/employer/dashboard" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/employer/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}>Dashboard</Link>
      <Link to="/employer/employees" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/employer/employees') ? 'text-primary' : 'text-muted-foreground'}`}>Employees</Link>
      <Link to="/employer/analytics" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/employer/analytics') ? 'text-primary' : 'text-muted-foreground'}`}>Analytics</Link>
      <Link to="/employer/costs" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/employer/costs') ? 'text-primary' : 'text-muted-foreground'}`}>Costs</Link>
    </>
  );

  const InsuranceNav = () => (
    <>
      <Link to="/insurance/dashboard" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/insurance/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}>Dashboard</Link>
      <Link to="/insurance/members" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/insurance/members') ? 'text-primary' : 'text-muted-foreground'}`}>Members</Link>
      <Link to="/insurance/contracts" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/insurance/contracts') ? 'text-primary' : 'text-muted-foreground'}`}>Contracts</Link>
      <Link to="/insurance/analytics" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/insurance/analytics') ? 'text-primary' : 'text-muted-foreground'}`}>Analytics</Link>
    </>
  );

  const renderNavLinks = () => {
    if (!isAuthenticated) return null;
    if (currentUser?.role === 'individual') return <PatientNav />;
    if (currentUser?.role === 'employer') return <EmployerNav />;
    if (currentUser?.role === 'insurance') return <InsuranceNav />;
    return null;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">PayPill</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 ml-6">
            {renderNavLinks()}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/auth/individual">Patient Login</Link>
              </Button>
              <Button asChild>
                <Link to="/">Get Started</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{currentUser.first_name || currentUser.name || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {currentUser?.role === 'individual' && (
                    <DropdownMenuItem asChild>
                      <Link to="/patient/onboarding">Update Profile</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[250px] sm:w-[300px]">
                  <nav className="flex flex-col gap-4 mt-8">
                    {renderNavLinks()}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}