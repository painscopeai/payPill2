import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Activity, Home, User, Sparkles, FileText, Calendar, Settings, LogOut, Menu, Bell } from 'lucide-react';

export default function PatientLayout({ children }) {
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    void logout();
  };

  const navItems = [
    { label: 'Dashboard', icon: Home, path: '/patient/dashboard' },
    { label: 'Records', icon: FileText, path: '/patient/records' },
    { label: 'Appointments', icon: Calendar, path: '/patient/appointments' },
    { label: 'Insights', icon: Sparkles, path: '/patient/ai-recommendations' },
    { label: 'Profile', icon: User, path: '/patient/onboarding' },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur flex items-center justify-between px-4 h-16">
        <Link to="/patient/dashboard" className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">PayPill</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] flex flex-col">
              <div className="py-4">
                <p className="font-medium">{currentUser?.first_name || 'Patient'}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
              </div>
              <nav className="flex flex-col gap-2 flex-1">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.path) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Link>
                ))}
              </nav>
              <Button variant="ghost" className="justify-start text-destructive mt-auto" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card min-h-screen sticky top-0">
        <div className="h-16 flex items-center px-6 border-b">
          <Link to="/patient/dashboard" className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">PayPill</span>
          </Link>
        </div>
        <div className="p-4 border-b">
          <p className="font-medium truncate">{currentUser?.first_name} {currentUser?.last_name}</p>
          <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive(item.path) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex h-16 items-center justify-between px-8 border-b bg-background/95 backdrop-blur sticky top-0 z-40">
          <div className="text-sm text-muted-foreground capitalize">
            {location.pathname.split('/').filter(Boolean).join(' / ')}
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-background flex items-center justify-around px-2 z-50 pb-safe">
        {navItems.slice(0, 4).map((item) => (
          <Link key={item.path} to={item.path} className={`flex flex-col items-center justify-center w-16 h-full gap-1 ${isActive(item.path) ? 'text-primary' : 'text-muted-foreground'}`}>
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}